import type { AuditEvent } from "@/domain/shipment";
import {
	createTextIndex,
	dateKey,
	textSearchQuery,
	zonedDayBoundary,
} from "@/shared/lib";

import { auditSearchFields, type AuditRow } from "./auditPresentation";

export type AuditFilters = Readonly<{
	search: string;
	result: "all" | AuditEvent["result"];
	from: string;
	to: string;
	warehouse_id?: string;
	order_id?: string;
	actor_id?: string;
	event_type?: string;
	area?: string;
	correlation_id?: string;
}>;

export const defaultAuditFilters: AuditFilters = Object.freeze({
	search: "",
	result: "all",
	from: "",
	to: "",
});

export function filterAuditRows(
	rows: readonly AuditRow[],
	{ search, result, from, to }: AuditFilters,
) {
	const matches = textSearchQuery(search);

	return rows.filter((row) => {
		if (result !== "all" && row.event.result !== result) return false;

		if (from || to) {
			const date = dateKey(row.event.occurred_at, row.event.time_zone);

			if (!date) return false;
			if (from && date < from) return false;
			if (to && date > to) return false;
		}

		return !matches || matches(createTextIndex(auditSearchFields(row.event)));
	});
}

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
