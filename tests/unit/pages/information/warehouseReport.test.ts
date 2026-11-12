import { expect, test } from "bun:test";
import type { Warehouse } from "@/entities/warehouse";
import {
	buildReport,
	previousPeriod,
	type ReportFilters,
} from "@/pages/information/model/report";
import { reportCsv } from "@/pages/information/model/reportCsv";
import { requiredAt } from "@/shared/lib/requiredAt";

import { reportWarehouse as base } from "../../../support/reportWarehouse";

const filters: ReportFilters = {
	from: "2026-11-01",
	to: "2026-11-02",
	kind: "all",
	status: "all",
	category: "all",
	compare: true,
};
test("report recognizes completed and active REST statuses and keeps current stock outside the period", () => {
	const report = buildReport(base, filters);
	expect(report.completed).toBe(1);
	expect(report.active).toBe(2);
	const empty = buildReport(base, {
		...filters,
		from: "2000-01-01",
		to: "2000-01-02",
	});
	expect(empty.orders).toHaveLength(0);
	expect(empty.stockQuantity).toBe(report.stockQuantity);
	expect(empty.inbound.value).toBe(0);
	expect(
		previousPeriod({ ...filters, from: "2026-03-01", to: "2026-03-03" }),
	).toMatchObject({ from: "2026-02-26", to: "2026-02-28" });
});
test("period boundaries use the warehouse timezone; category and unknown prices do not inflate money", () => {
	const product = base.products[0];
	const order = base.orders[0];
	if (!product || !order) throw new Error("Missing fixtures");
	const w = {
		...base,
		products: [
			{ ...product, id: "known", category: "a", price: "2.50" },
			{ ...product, id: "unknown", category: "b", price: "" },
		],
		orders: [
			{
				...order,
				kind: "inbound" as const,
				created: "2026-10-31T22:00:00Z",
				lines: [
					{ product: "known", quantity: 4, expires: "" },
					{ product: "unknown", quantity: 3, expires: "" },
				],
			},
		],
	};
	const report = buildReport(w, {
		...filters,
		from: "2026-11-01",
		to: "2026-11-01",
	});
	expect(report.orders).toHaveLength(1);
	expect(report.inbound).toEqual({ value: 10, known: 4, unknown: 3 });
	expect(report.series[0]?.day).toBe("2026-11-01");
	expect(buildReport(w, { ...filters, category: "b" }).inbound).toEqual({
		value: 0,
		known: 0,
		unknown: 3,
	});
	expect(
		buildReport({ ...w, writeOffs: undefined }, filters).writeOffQuantity,
	).toBeUndefined();
	expect(buildReport({ ...w, writeOffs: [] }, filters).writeOffQuantity).toBe(
		0,
	);
});
test("CSV preserves filters, comparison and unavailable write-offs while escaping spreadsheet formulas", () => {
	const csv = reportCsv(
		{ ...base, name: '=HYPERLINK("bad")', writeOffs: undefined },
		filters,
	);
	expect(csv.startsWith("\uFEFF")).toBe(true);
	expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
	expect(csv).toContain('"Предыдущий период"');
	expect(csv).toContain('"Нет данных"');
	expect(csv).toContain('"2026-11-01";"2026-11-02"');
});
test("unpriced details match each metric and preserve report filters and historical write-off prices", () => {
	const product = requiredAt(base.products, 0);
	const order = requiredAt(base.orders, 0);
	const stock = requiredAt(base.stock, 0);
	const w: Warehouse = {
		...base,
		products: [
			{ ...product, id: "unknown", category: "a", price: "" },
			{ ...product, id: "zero", category: "a", price: "0" },
			{ ...product, id: "other", category: "b", price: "" },
		],
		orders: [
			{
				...order,
				id: "in",
				kind: "inbound",
				created: "2026-11-01T12:00:00Z",
				lines: [
					{ product: "unknown", quantity: 2, expires: "" },
					{ product: "zero", quantity: 5, expires: "" },
					{ product: "other", quantity: 9, expires: "" },
				],
			},
			{
				...order,
				id: "out",
				kind: "outbound",
				created: "2026-11-01T12:00:00Z",
				lines: [{ product: "unknown", quantity: 3, expires: "" }],
			},
			{
				...order,
				id: "old",
				created: "2000-01-01T12:00:00Z",
				lines: [{ product: "unknown", quantity: 100, expires: "" }],
			},
		],
		stock: [
			{ ...stock, id: "batch", product: "unknown", quantity: 4 },
			{ ...stock, id: "other-batch", product: "other", quantity: 8 },
		],
		writeOffs: [
			{
				id: "lost",
				product: "zero",
				quantity: 2,
				price: null,
				time: "2026-11-01T12:00:00Z",
				reason: "Порча",
			},
			{
				id: "priced",
				product: "unknown",
				quantity: 7,
				price: 10,
				time: "2026-11-01T12:00:00Z",
				reason: "Порча",
			},
		],
	};
	const report = buildReport(w, { ...filters, category: "a" });
	for (const [key, count] of [
		["inbound", report.inbound.unknown],
		["outbound", report.outbound.unknown],
		["stock", report.unpricedStock],
		["writeOffs", report.unpricedWriteOffs],
	] as const) {
		expect(
			report.unpricedDetails[key].reduce((sum, row) => sum + row.quantity, 0),
		).toBe(count ?? 0);
	}
	expect(report.unpricedDetails.inbound.map((row) => row.quantity)).toEqual([
		2,
	]);
	expect(report.unpricedDetails.outbound.map((row) => row.quantity)).toEqual([
		3,
	]);
	expect(report.unpricedDetails.stock.map((row) => row.quantity)).toEqual([4]);
	expect(report.unpricedDetails.writeOffs.map((row) => row.id)).toEqual([
		"lost",
	]);
	expect(
		buildReport(w, { ...filters, category: "a", kind: "outbound" })
			.unpricedDetails.inbound,
	).toEqual([]);
	expect(
		buildReport(w, { ...filters, status: "missing-status" }).unpricedDetails
			.outbound,
	).toEqual([]);
});
