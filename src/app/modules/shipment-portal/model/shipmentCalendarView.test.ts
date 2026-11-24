import { expect, test } from "bun:test";
import { shipment } from "../../../../../tests/support/shipment";
import {
	calendarDetail,
	calendarRows,
	calendarTotals,
	type ShipmentCalendarOptions,
} from "./shipmentCalendarView";

const filters = { from: "", to: "", item: null, transport: "", weekly: false };

function options(): ShipmentCalendarOptions {
	const sample = shipment();

	return {
		shipment: sample,
		items: sample.items,
		priority: "high",
		showPriority: true,
	};
}

test("calendar uses the order time zone and sorts quantities as numbers", () => {
	const rows = calendarRows(options(), filters, {
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

test("weekly totals combine filtered days and keep quantities of different units separate", () => {
	const input = options();
	input.shipment.plan.push({
		date: "2026-11-14",
		order_line_id: "pallets",
		quantity: 5,
		unit: "pallet",
	});
	const rows = calendarRows(
		input,
		{ ...filters, weekly: true },
		{ field: "date", ascending: true },
	);

	expect(rows.map(({ date }) => date)).toEqual(["2026-11-09", "2026-11-09"]);
	expect(calendarTotals(rows)).toEqual([
		{ unit: "pcs", plan: 12, actual: 3 },
		{ unit: "pallet", plan: 5, actual: 0 },
	]);
});

test("actual-only rows retain an unknown plan and date filters restrict facts", () => {
	const input = options();
	input.shipment.plan = [];
	const rows = calendarRows(input, filters, { field: "date", ascending: true });

	expect(rows[0]?.cells).toMatchObject({
		plan: null,
		actual: 3,
		remaining: null,
	});
	expect(calendarTotals(rows)).toEqual([
		{ unit: "pcs", plan: null, actual: 3 },
	]);
	expect(
		calendarRows(
			input,
			{ ...filters, from: "2026-11-14" },
			{ field: "date", ascending: true },
		),
	).toEqual([]);
});

test("details for a unit include only its facts and ignore a missing row selection", () => {
	const input = options();
	const first = input.shipment.actual[0];

	if (!first) throw new Error("Missing fact fixture");

	input.shipment.actual.push({
		...first,
		id: "fact-2",
		unit: "pallet",
		quantity: 1,
	});
	const rows = calendarRows(input, filters, { field: "date", ascending: true });

	expect(
		calendarDetail(rows, { kind: "total", unit: "pcs" })?.facts.map(
			({ id }) => id,
		),
	).toEqual(["fact-1"]);
	expect(calendarDetail(rows, { kind: "row", key: "missing" })).toBeNull();
	expect(calendarDetail(rows, null)).toBeNull();
});

test("a total selection closes after its unit disappears from the snapshot", () => {
	const rows = calendarRows(options(), filters, {
		field: "date",
		ascending: true,
	});

	expect(calendarDetail(rows, { kind: "total", unit: "missing" })).toBeNull();
});

test("item filtering distinguishes a literal all identifier from no filter", () => {
	const input = options();
	input.shipment.plan = [
		{ date: "2026-11-13", order_line_id: "all", quantity: 10, unit: "pcs" },
		{ date: "2026-11-13", order_line_id: "coffee", quantity: 2, unit: "pcs" },
	];
	input.shipment.actual = [];
	const rows = calendarRows(
		input,
		{ ...filters, item: "all" },
		{ field: "date", ascending: true },
	);

	expect(rows.map(({ cells }) => cells.plan)).toEqual([10]);
});

test("a row selection closes after its actual facts disappear but its plan remains", () => {
	const input = options();
	const originalRows = calendarRows(input, filters, {
		field: "date",
		ascending: true,
	});
	const key = originalRows[0]?.key;

	if (!key) throw new Error("Missing calendar row fixture");

	input.shipment.actual = [];
	const refreshedRows = calendarRows(input, filters, {
		field: "date",
		ascending: true,
	});

	expect(calendarDetail(refreshedRows, { kind: "row", key })).toBeNull();
});
