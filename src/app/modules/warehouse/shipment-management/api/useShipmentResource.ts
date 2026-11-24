import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
	useSandboxAccess,
	useSession,
	useWorkspaceMode,
} from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import {
	type WorkingShipment,
	workingShipmentSchema,
} from "../model/shipment.dto";
import type { shipmentDraft } from "../model/shipmentEditor";
import { shipmentDocuments } from "./shipmentDocuments";
import { shipmentSharing } from "./shipmentSharing";
import { useShipmentCreation } from "./useShipmentCreation";

export function useShipmentResource(
	http: HttpClient,
	warehouseId: string,
	orderId: string,
) {
	const path = `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}/shipment`;
	const scopeId = useWarehouseScopeId();
	const session = useSession();
	const mode = useWorkspaceMode();
	const { access } = useSandboxAccess();
	const accountSessionId =
		session.status === "active" ? session.sessionId : null;
	const sessionId = mode === "sandbox" ? access?.access_id : accountSessionId;
	const storageScope = mode === "sandbox" ? [mode, sessionId] : [sessionId];
	const storageKey = sessionId
		? `gridly.shipment-attempt:${JSON.stringify([...storageScope, warehouseId, orderId])}`
		: null;
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
		...documents,
		...sharing,
	};
}

export type ShipmentResource = ReturnType<typeof useShipmentResource>;
