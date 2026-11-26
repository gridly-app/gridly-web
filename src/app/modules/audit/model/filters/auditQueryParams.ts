import { zonedDayBoundary } from "@/shared/lib";

import type { AuditFilters } from "./auditFilters";

export function auditQueryParams(
	filters: AuditFilters,
	timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
	const { search, result, from, to, ...fields } = filters;
	const query = search.trim();
	const params = new URLSearchParams();

	if (query) params.set("q", query);

	if (result !== "all") params.set("result", result);

	if (from) params.set("from", zonedDayBoundary(from, timeZone));

	if (to) params.set("to", zonedDayBoundary(to, timeZone, true));

	const filterEntries = Object.entries(fields);

	filterEntries.sort();

	for (const [field, value] of filterEntries) {
		const filter = value?.trim();

		if (filter) params.set(field, filter);
	}

	return params.toString();
}
