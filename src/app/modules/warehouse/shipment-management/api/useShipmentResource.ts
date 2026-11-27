import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAttemptSession } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type FileHttpClient, parseResponse } from "@/shared/http";
import { operationAttemptKey } from "@/shared/lib";

import type { ShipmentDraft } from "../model/shipmentEditor";
import { type WorkingShipment, workingShipmentSchema } from "./shipment.dto";
import { shipmentDocuments } from "./shipmentDocuments";
import { shipmentPath } from "./shipmentPath";
import { shipmentSharing } from "./shipmentSharing";
import { useShipmentCreation } from "./useShipmentCreation";

function useShipmentAttemptKey(warehouseId: string, orderId: string) {
	const attemptSession = useAttemptSession();

	if (!attemptSession) return null;

	const { mode, sessionId } = attemptSession;
	const scope = mode === "sandbox" ? [mode, sessionId] : [sessionId];

	return operationAttemptKey("shipment", [...scope, warehouseId, orderId]);
}

export function useShipmentResource(
	http: FileHttpClient,
	warehouseId: string,
	orderId: string,
) {
	const path = shipmentPath(warehouseId, orderId);
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

	async function rereadShipment() {
		const result = await query.refetch({ throwOnError: true });

		return result.data;
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

	function replaceShipment(signal: AbortSignal, shipment: WorkingShipment) {
		return applyConfirmedUpdate(signal, () => shipment);
	}

	async function save(body: ShipmentDraft, signal: AbortSignal) {
		const response = await http.request(path, { method: "PUT", body, signal });
		const shipment = parseResponse(workingShipmentSchema, response);

		await replaceShipment(signal, shipment);
	}

	const creation = useShipmentCreation(queryKey, storageKey, query.refetch);
	const documents = shipmentDocuments({
		http,
		path,
		creation,
		getDocumentCount: () => query.data?.documents.length,
		readShipment,
		replaceShipment,
	});
	const sharing = shipmentSharing({
		http,
		path,
		creation,
		rereadShipment,
		applyConfirmedUpdate,
	});

	return {
		creation: creation.attempt,
		hasUploadFile: creation.hasUploadFile,
		query,
		refresh,
		save,
		...documents,
		...sharing,
	};
}

export type ShipmentResource = ReturnType<typeof useShipmentResource>;
