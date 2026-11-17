import { replaceEqualDeep } from "@tanstack/react-query";

import type { HttpClient } from "@/shared/http";
import { UserError } from "@/shared/lib";

import type { AuditPage } from "./audit.dto";
import { readAuditPage } from "./auditPageApi";

export async function verifyAuditSnapshot(
	http: HttpClient,
	path: string,
	pages: readonly AuditPage[],
) {
	async function verifyPage(expected: AuditPage, offset: number) {
		const current = await readAuditPage(http, path, offset);

		const matches = replaceEqualDeep(expected, current) === expected;

		if (!matches) {
			throw new UserError(
				"Журнал изменился после загрузки. Обновите журнал и повторите экспорт.",
			);
		}
	}

	let offset = 0;

	for (const page of pages) {
		await verifyPage(page, offset);
		offset += page.items.length;
	}

	const firstPage = pages[0];

	if (firstPage && pages.length > 1) await verifyPage(firstPage, 0);
}
