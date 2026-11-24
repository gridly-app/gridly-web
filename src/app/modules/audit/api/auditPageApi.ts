import { type HttpClient, parseResponse } from "@/shared/http";

import { auditSchema } from "./audit.dto";

const batchSize = 50;

export async function readAuditPage(
	http: HttpClient,
	path: string,
	filters: string,
	cursor: string | null,
	signal?: AbortSignal,
) {
	const params = new URLSearchParams(filters);

	params.set("limit", String(batchSize));
	if (cursor !== null) params.set("cursor", cursor);

	const response = await http.request(`${path}?${params}`, { signal });

	return parseResponse(auditSchema, response);
}
