import { dateKey, createTextIndex, textSearchQuery } from "@/shared/lib";

import { changeLabel, changeValue } from "./auditChanges";
import type { AuditRow } from "./auditPresentation";

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

const dateKeyByRow = new WeakMap<AuditRow, string | null>();
const searchIndexByRow = new WeakMap<
	AuditRow,
	ReturnType<typeof createTextIndex>
>();

function getDateKey(row: AuditRow) {
	const cached = dateKeyByRow.get(row);

	if (cached !== undefined) return cached;

	const key = dateKey(row.event.occurred_at, row.event.time_zone);

	dateKeyByRow.set(row, key);

	return key;
}

function auditSearchFields({ event, summary }: AuditRow) {
	return [
		...Object.values(summary),
		event.id,
		event.correlation_id,
		event.event_type,
		event.actor_id ?? "",
		event.warehouse_id ?? "",
		event.order_id ?? "",
		...event.changes.flatMap((change) => [
			changeLabel(change),
			changeValue(change.field, change.before),
			changeValue(change.field, change.after),
		]),
	];
}

function getSearchIndex(row: AuditRow) {
	const cached = searchIndexByRow.get(row);

	if (cached) return cached;

	const index = createTextIndex(auditSearchFields(row));

	searchIndexByRow.set(row, index);

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
			const date = getDateKey(row);
			if (!date) return false;
			if (from && date < from) return false;
			if (to && date > to) return false;
		}

		return !matches || matches(getSearchIndex(row));
	});
}
