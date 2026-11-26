import { expect, test } from "bun:test";

import { byDate, calendarOptions, filters } from "./calendar.test-support";
import { calendarDetail } from "./calendarDetail";
import { calendarRows } from "./calendarRows";

test("details for a unit include only its facts and ignore a missing row selection", () => {
	const input = calendarOptions();
	const first = input.shipment.actual[0];

	if (!first) throw new Error("Missing fact fixture");

	input.shipment.actual.push({
		...first,
		id: "fact-2",
		unit: "pallet",
		quantity: 1,
	});

	const rows = calendarRows(input, filters, byDate);

	expect(
		calendarDetail(rows, { kind: "total", unit: "pcs" })?.facts.map(
			({ id }) => id,
		),
	).toEqual(["fact-1"]);
	expect(calendarDetail(rows, { kind: "row", key: "missing" })).toBeNull();
	expect(calendarDetail(rows, null)).toBeNull();
});

test("a total selection closes after its unit disappears from the snapshot", () => {
	const rows = calendarRows(calendarOptions(), filters, byDate);

	expect(calendarDetail(rows, { kind: "total", unit: "missing" })).toBeNull();
});

test("a row selection closes after its actual facts disappear but its plan remains", () => {
	const input = calendarOptions();
	const key = calendarRows(input, filters, byDate)[0]?.key;

	if (!key) throw new Error("Missing calendar row fixture");

	input.shipment.actual = [];

	const refreshedRows = calendarRows(input, filters, byDate);

	expect(calendarDetail(refreshedRows, { kind: "row", key })).toBeNull();
});
