import { useQuery } from "@tanstack/react-query";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { type AuditEvent, auditSchema } from "./shipmentAudit";

const batchSize = 200;

async function readAudit(
	http: FetchHttpClient,
	path: string,
	signal: AbortSignal,
) {
	const events = new Map<string, AuditEvent>();
	for (let offset = 0; ;) {
		const page = parseResponse(
			auditSchema,
			await http.request(`${path}?limit=${batchSize}&offset=${offset}`, {
				signal,
			}),
		);
		for (const event of page.items) events.set(event.id, event);
		offset += page.items.length;
		if (!page.items.length || offset >= page.total) break;
	}
	return [...events.values()];
}

export function useAuditEvents(
	http: FetchHttpClient,
	path: string,
	enabled = true,
) {
	const scopeId = useWarehouseScopeId();
	return useQuery({
		queryKey: [scopeId, "shipment-admin", path],
		queryFn: ({ signal }) => readAudit(http, path, signal),
		enabled,
		retry: false,
	});
}
