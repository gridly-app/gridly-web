import { expect, test } from "bun:test";

import { byDate, calendarOptions, filters } from "./calendar.test-support";
import { calendarRows } from "./calendarRows";
import { calendarTotals } from "./calendarTotals";

test("weekly totals combine filtered days and keep quantities of different units separate", () => {
	const input = calendarOptions();

	input.shipment.plan.push({
		date: "2026-11-14",
		order_line_id: "pallets",
		quantity: 5,
		unit: "pallet",
	});

	const rows = calendarRows(input, { ...filters, weekly: true }, byDate);

	expect(rows.map(({ date }) => date)).toEqual(["2026-11-09", "2026-11-09"]);
	expect(calendarTotals(rows)).toEqual([
		{ unit: "pcs", plan: 12, actual: 3 },
		{ unit: "pallet", plan: 5, actual: 0 },
	]);
});
