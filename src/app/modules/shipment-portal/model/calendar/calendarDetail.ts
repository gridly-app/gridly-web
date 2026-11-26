import type { CalendarRow } from "./calendarRows";

export type CalendarSelection =
	{ kind: "row"; key: string } | { kind: "total"; unit: string } | null;

export function calendarDetail(
	rows: CalendarRow[],
	selection: CalendarSelection,
) {
	if (!selection) return null;

	if (selection.kind === "row") {
		const row = rows.find((row) => row.key === selection.key);

		if (!row || row.facts.length === 0) return null;

		return { title: `Факт отгрузки · ${row.date}`, facts: row.facts };
	}

	const selectedRows = rows.filter((row) => row.unit === selection.unit);
	const facts = selectedRows.flatMap((row) => row.facts);

	if (facts.length === 0) return null;

	return { title: "Факт за выбранный период", facts };
}
