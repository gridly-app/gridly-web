import type { CalendarField } from "../../config/calendarColumns";
import type { CalendarCells, CalendarRow } from "./calendarRows";

export type CalendarSort = { field: CalendarField; ascending: boolean };

export const defaultCalendarSort: CalendarSort = {
	field: "date",
	ascending: true,
};

const collator = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
});

type CellValue = CalendarCells[CalendarField];

function compareCells(left: CellValue, right: CellValue) {
	if (typeof left === "number" && typeof right === "number")
		return left - right;

	return collator.compare(String(left ?? ""), String(right ?? ""));
}

export function sortCalendarRows(
	rows: CalendarRow[],
	{ field, ascending }: CalendarSort,
) {
	const direction = ascending ? 1 : -1;

	return [...rows].sort(
		(left, right) =>
			direction * compareCells(left.cells[field], right.cells[field]),
	);
}
