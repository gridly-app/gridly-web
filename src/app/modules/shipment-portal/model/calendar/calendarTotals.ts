import type { CalendarRow } from "./calendarRows";

export function calendarTotals(rows: CalendarRow[]) {
	const totals = new Map<string, { plan: number | null; actual: number }>();

	for (const row of rows) {
		const total = totals.get(row.unit) ?? { plan: null, actual: 0 };

		if (row.plan !== null) total.plan = (total.plan ?? 0) + row.plan;

		total.actual += row.actual;
		totals.set(row.unit, total);
	}

	return [...totals].map(([unit, total]) => ({ unit, ...total }));
}

export type CalendarTotal = ReturnType<typeof calendarTotals>[number];
