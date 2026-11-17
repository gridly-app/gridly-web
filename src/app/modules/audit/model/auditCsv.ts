import { type AuditRow, changeLabel, changeValue } from "./auditPresentation";

const headings = [
	"Дата и время",
	"Событие",
	"Результат",
	"Пользователь",
	"Склад",
	"Заказ",
	"Источник",
	"Изменения",
];

function csvCell(value: string) {
	const safe = /^\s*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;

	return `"${safe.replaceAll('"', '""')}"`;
}

export function auditCsv(rows: AuditRow[]) {
	const lines = [headings.map(csvCell).join(",")];

	for (const { event, summary } of rows) {
		const changes = event.changes
			.map((change) => {
				const label = changeLabel(change);
				const before = changeValue(change.field, change.before);
				const after = changeValue(change.field, change.after);

				return `${label}: ${before} → ${after}`;
			})
			.join("; ");
		const cells = [
			summary.date,
			summary.event,
			summary.result,
			summary.actor,
			summary.warehouse,
			summary.order,
			summary.source,
			changes,
		];

		lines.push(cells.map(csvCell).join(","));
	}

	return lines.join("\r\n");
}
