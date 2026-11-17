import { dateKey, createTextIndex, textSearchQuery } from "@/shared/lib";
import { type AuditRow, auditSearchFields } from "./auditPresentation";

export type AuditFilters = {
	search: string;
	result: "all" | AuditRow["event"]["result"];
	from: string;
	to: string;
};

export const defaultAuditFilters: AuditFilters = {
	search: "",
	result: "all",
	from: "",
	to: "",
};

const dates = new WeakMap<AuditRow, string | null>();
const indexes = new WeakMap<AuditRow, ReturnType<typeof createTextIndex>>();

function dateFor(row: AuditRow) {
	const cached = dates.get(row);

	if (cached !== undefined) return cached;

	const date = dateKey(row.event.occurred_at, row.event.time_zone);
	dates.set(row, date);

	return date;
}

function indexFor(row: AuditRow) {
	const cached = indexes.get(row);

	if (cached) return cached;

	const index = createTextIndex(auditSearchFields(row));
	indexes.set(row, index);

	return index;
}

export function filterAuditRows(
	rows: AuditRow[],
	{ search, result, from, to }: AuditFilters,
) {
	const matches = textSearchQuery(search);

	return rows.filter((row) => {
		if (result !== "all" && row.event.result !== result) return false;

		if (from || to) {
			const date = dateFor(row);
			if (!date) return false;
			if (from && date < from) return false;
			if (to && date > to) return false;
		}

		return !matches || matches(indexFor(row));
	});
}
