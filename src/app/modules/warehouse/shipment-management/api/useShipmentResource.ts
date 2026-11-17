import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { issuedLinkSchema } from "@/domain/shipment";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import {
	type WorkingShipment,
	workingShipmentSchema,
} from "../model/shipment.dto";
import type { shipmentDraft } from "../model/shipmentEditor";

export function useShipmentResource(
	http: HttpClient,
	warehouseId: string,
	orderId: string,
) {
	const path = `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}/shipment`;
	const scopeId = useWarehouseScopeId();
	const queryKey = [scopeId, "shipment-management", warehouseId, orderId];
	const issueAttempt = useRef<{
		scopeId: string;
		path: string;
		expiresAt: string;
		key: string;
	} | null>(null);
	const client = useQueryClient();
	const query = useQuery({
		queryKey,
		queryFn: async ({ signal }) =>
			parseResponse(
				workingShipmentSchema,
				await http.request(path, { signal }),
			),
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

	async function issueLink(expiresAt: string, signal: AbortSignal) {
		const previous = issueAttempt.current;
		const key =
			previous?.scopeId === scopeId &&
			previous.path === path &&
			previous.expiresAt === expiresAt
				? previous.key
				: crypto.randomUUID();
		const attempt = { scopeId, path, expiresAt, key };

		issueAttempt.current = attempt;

		const response = await http.request(`${path}/share-link`, {
			method: "POST",
			body: { expires_at: expiresAt },
			idempotencyKey: key,
			privacy: true,
			signal,
		});
		const link = parseResponse(issuedLinkSchema, response);

		if (issueAttempt.current === attempt) issueAttempt.current = null;

		await applyConfirmedUpdate(
			signal,
			(current) =>
				current && { ...current, share_link: { expires_at: link.expires_at } },
		);

		return link;
	}

	async function revokeLink(signal: AbortSignal) {
		await http.request(`${path}/share-link`, { method: "DELETE", signal });

		if (
			issueAttempt.current?.scopeId === scopeId &&
			issueAttempt.current.path === path
		) {
			issueAttempt.current = null;
		}

		await applyConfirmedUpdate(
			signal,
			(current) => current && { ...current, share_link: null },
		);
	}

	async function uploadDocument(body: FormData, signal: AbortSignal) {
		await http.request(`${path}/documents`, { method: "POST", body, signal });
	}

	async function publishDocument(
		id: string,
		published: boolean,
		signal: AbortSignal,
	) {
		await http.request(`${path}/documents/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: { published },
			signal,
		});

		await applyConfirmedUpdate(
			signal,
			(current) =>
				current && {
					...current,
					documents: current.documents.map((document) =>
						document.id === id ? { ...document, published } : document,
					),
				},
		);
	}

	return {
		query,
		refresh,
		save,
		issueLink,
		revokeLink,
		uploadDocument,
		publishDocument,
	};
}

export type ShipmentResource = ReturnType<typeof useShipmentResource>;
