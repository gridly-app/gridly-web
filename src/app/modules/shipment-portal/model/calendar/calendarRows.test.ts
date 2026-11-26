import { expect, test } from "bun:test";

import { byDate, calendarOptions, filters } from "./calendar.test-support";
import { calendarRows } from "./calendarRows";
import { calendarTotals } from "./calendarTotals";

test("calendar uses the order time zone and sorts quantities as numbers", () => {
	const rows = calendarRows(calendarOptions(), filters, {
		field: "plan",
		ascending: true,
	});

	expect(
		rows.map(({ cells }) => [
			cells.date,
			cells.plan,
			cells.actual,
			cells.remaining,
		]),
	).toEqual([
		["2026-11-14", 2, 0, 2],
		["2026-11-13", 10, 3, 7],
	]);
	expect(rows[1]?.cells).toMatchObject({
		item: "Кофе",
		priority: "Высокий",
		status: "В исполнении",
	});
});

test("actual-only rows retain an unknown plan and date filters restrict facts", () => {
	const input = calendarOptions();

	input.shipment.plan = [];

	const rows = calendarRows(input, filters, byDate);

	expect(rows[0]?.cells).toMatchObject({
		plan: null,
		actual: 3,
		remaining: null,
	});
	expect(calendarTotals(rows)).toEqual([
		{ unit: "pcs", plan: null, actual: 3 },
	]);
	expect(
		calendarRows(input, { ...filters, from: "2026-11-14" }, byDate),
	).toEqual([]);
});

test("item filtering distinguishes a literal all identifier from no filter", () => {
	const input = calendarOptions();

	input.shipment.plan = [
		{ date: "2026-11-13", order_line_id: "all", quantity: 10, unit: "pcs" },
		{ date: "2026-11-13", order_line_id: "coffee", quantity: 2, unit: "pcs" },
	];
	input.shipment.actual = [];

	const rows = calendarRows(input, { ...filters, item: "all" }, byDate);

	expect(rows.map(({ cells }) => cells.plan)).toEqual([10]);
});
