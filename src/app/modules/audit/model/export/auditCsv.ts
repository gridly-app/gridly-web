import { encodeCsv } from "@/shared/lib";

import { changeLabel, changeValue } from "../auditChanges";
import type { AuditRow } from "../auditPresentation";

const columns: { heading: string; value: (row: AuditRow) => string }[] = [
	{ heading: "Дата и время", value: ({ summary }) => summary.date },
	{ heading: "Событие", value: ({ summary }) => summary.event },
	{ heading: "Результат", value: ({ summary }) => summary.result },
	{ heading: "Пользователь", value: ({ summary }) => summary.actor },
	{ heading: "Склад", value: ({ summary }) => summary.warehouse },
	{ heading: "Заказ", value: ({ summary }) => summary.order },
	{ heading: "Источник", value: ({ summary }) => summary.source },
	{ heading: "Изменения", value: formatChanges },
	{ heading: "ID пользователя", value: ({ event }) => event.actor_id ?? "" },
	{ heading: "ID склада", value: ({ event }) => event.warehouse_id ?? "" },
	{ heading: "ID заказа", value: ({ event }) => event.order_id ?? "" },
	{ heading: "Код события", value: ({ event }) => event.event_type },
	{ heading: "Код источника", value: ({ event }) => event.source },
	{ heading: "ID события", value: ({ event }) => event.id },
	{ heading: "ID операции", value: ({ event }) => event.correlation_id },
	{
		heading: "Дата и время (ISO 8601)",
		value: ({ event }) => event.occurred_at,
	},
];

function formatChanges({ event }: AuditRow) {
	const changes = event.changes.map((change) => {
		const { field, before, after } = change;
		const label = changeLabel(change);
		const previous = changeValue(field, before, event.time_zone);
		const next = changeValue(field, after, event.time_zone);

		return `${label}: ${previous} → ${next}`;
	});

	return changes.join("; ");
}

export function auditCsv(rows: readonly AuditRow[]) {
	const header = columns.map(({ heading }) => heading);
	const data = rows.map((row) => columns.map(({ value }) => value(row)));

	return encodeCsv([header, ...data]);
}
