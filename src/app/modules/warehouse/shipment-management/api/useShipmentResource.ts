import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAttemptSession } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type FileHttpClient, parseResponse } from "@/shared/http";
import { operationAttemptKey } from "@/shared/lib";

import {
	type WorkingShipment,
	workingShipmentSchema,
} from "../model/shipment.dto";
import type { shipmentDraft } from "../model/shipmentEditor";
import { shipmentDocuments } from "./shipmentDocuments";
import { shipmentSharing } from "./shipmentSharing";
import { useShipmentCreation } from "./useShipmentCreation";

export function useShipmentResource(
	http: FileHttpClient,
	warehouseId: string,
	orderId: string,
) {
	const path = `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}/shipment`;
	const scopeId = useWarehouseScopeId();
	const storageKey = useShipmentAttemptKey(warehouseId, orderId);
	const queryKey = [scopeId, "shipment-management", warehouseId, orderId];
	const client = useQueryClient();
	async function readShipment(signal: AbortSignal) {
		const response = await http.request(path, { signal });

		return parseResponse(workingShipmentSchema, response);
	}

	const query = useQuery({
		queryKey,
		queryFn: ({ signal }) => readShipment(signal),
		retry: false,
		refetchOnWindowFocus: false,
	});

	async function refresh() {
		await query.refetch({ throwOnError: true });
	}

	async function applyConfirmedUpdate(
		signal: AbortSignal,
		update: (
			current: WorkingShipment | undefined,
		) => WorkingShipment | undefined,
	) {
		await client.cancelQueries({ queryKey, exact: true });
		signal.throwIfAborted();

		client.setQueryData<WorkingShipment>(queryKey, update);
	}

	async function save(
		body: ReturnType<typeof shipmentDraft>,
		signal: AbortSignal,
	) {
		const response = await http.request(path, { method: "PUT", body, signal });
		const shipment = parseResponse(workingShipmentSchema, response);

		await applyConfirmedUpdate(signal, () => shipment);
	}

	const creation = useShipmentCreation(queryKey, storageKey, query.refetch);
	const documents = shipmentDocuments({
		http,
		path,
		creation,
		getDocumentCount: () => query.data?.documents.length,
		readShipment,
		replaceShipment: (signal, shipment) =>
			applyConfirmedUpdate(signal, () => shipment),
	});
	const sharing = shipmentSharing({
		http,
		path,
		creation,
		rereadShipment: async () =>
			(await query.refetch({ throwOnError: true })).data,
		applyConfirmedUpdate,
	});

	return {
		creation: creation.attempt,
		hasUploadFile: creation.hasUploadFile,
		query,
		refresh,
		save,
		uploadDocument: documents.uploadDocument,
		retryUpload: documents.retryUpload,
		downloadDocument: documents.downloadDocument,
		publishDocument: documents.publishDocument,
		issueLink: sharing.issueLink,
		revokeLink: sharing.revokeLink,
		retryLink: sharing.retryLink,
	};
}

export type ShipmentResource = ReturnType<typeof useShipmentResource>;

function useShipmentAttemptKey(warehouseId: string, orderId: string) {
	const attemptSession = useAttemptSession();

	if (!attemptSession) return null;

	const { mode, sessionId } = attemptSession;
	const scope = mode === "sandbox" ? [mode, sessionId] : [sessionId];

	return operationAttemptKey("shipment", [...scope, warehouseId, orderId]);
}
