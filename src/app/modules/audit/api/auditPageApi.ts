import { type HttpClient, parseResponse } from "@/shared/http";
import { UserError } from "@/shared/lib";

import { auditSchema } from "./audit.dto";

const batchSize = 200;

export async function readAuditPage(
	http: HttpClient,
	path: string,
	offset: number,
	signal?: AbortSignal,
) {
	const url = `${path}?limit=${batchSize}&offset=${offset}`;
	const response = await http.request(url, { signal });
	const page = parseResponse(auditSchema, response);

	if (!page.items.length && offset < page.total) {
		throw new UserError("Журнал изменился во время загрузки. Обновите журнал.");
	}

	return page;
}
