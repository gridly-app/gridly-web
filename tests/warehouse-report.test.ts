import { expect, test } from "bun:test";
import { z } from "zod";
import type { Cell, Warehouse } from "../src/entities/warehouse";
import { RestWarehouseCommands } from "../src/entities/warehouse/api/commands/restCommands";
import {
	categoryDto,
	orderDto,
	productDto,
	stockDto,
	warehouseDto,
} from "../src/entities/warehouse/api/contracts/contract";
import {
	categoryFromDto,
	orderFromDto,
	productFromDto,
	stockFromDto,
	warehouseFromDto,
} from "../src/entities/warehouse/api/repositories/restMappers";
import { storageBlocks } from "../src/entities/warehouse/model/layout/blockRoutes";
import { findWarehousePath } from "../src/entities/warehouse/model/layout/findWarehousePath";
import {
	buildReport,
	previousPeriod,
	type ReportFilters,
	reportCsv,
} from "../src/pages/information/model/report";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "../src/pages/map/lib/map/robotMotion";
import { getOrderPresentation } from "../src/pages/orders/model/getOrderPresentation";
import type { RequestOptions } from "../src/shared/api";
import { requiredAt } from "../src/shared/lib/requiredAt";

const fixture = z
	.object({
		routes: z.array(
			z.object({
				name: z.string(),
				response: z.object({ body: z.object({ data: z.string() }).optional() }),
			}),
		),
	})
	.parse(
		Bun.YAML.parse(
			await Bun.file(
				new URL("../bruno/mocks/Gridly API.yml", import.meta.url),
			).text(),
		),
	);
function payload(name: string): unknown {
	const data = fixture.routes.find((r) => r.name === name)?.response.body?.data;
	if (!data) throw new Error(`Missing fixture ${name}`);
	return JSON.parse(data);
}
function items<T>(name: string, schema: z.ZodType<T>): T[] {
	return z.object({ items: z.array(schema) }).parse(payload(name)).items;
}
const base: Warehouse = {
	...warehouseFromDto(warehouseDto.parse(payload("Warehouse details"))),
	orders: items("orders", orderDto).map(orderFromDto),
	products: items("products", productDto).map(productFromDto),
	categories: items("categories", categoryDto).map(categoryFromDto),
	stock: items("inventory", stockDto).map(stockFromDto),
};
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
test("archive and settings mutations preserve scoped paths and revision preconditions", async () => {
	const calls: { path: string; options: RequestOptions }[] = [];
	const settings = {
		revision: 4,
		location: "Москва",
		low_stock_threshold: 12,
		allocation_policy: "fefo",
	};
	const commands = new RestWarehouseCommands(
		{ request: async () => ({}) },
		async (path, options) => {
			calls.push({ path, options });
			return settings;
		},
	);
	const product = requiredAt(base.products, 0);
	await commands.execute(
		base.id,
		{
			action: "warehouseSettings",
			value: { revision: 3, lowStockThreshold: 12 },
		},
		base,
	);
	expect(calls[0]).toMatchObject({
		path: `/warehouses/${base.id}/settings`,
		options: {
			method: "PATCH",
			body: { revision: 3, low_stock_threshold: 12 },
		},
	});
	await commands.execute(
		base.id,
		{ action: "archiveProduct", value: product.id },
		base,
	);
	expect(calls[1]).toMatchObject({
		path: `/warehouses/${base.id}/products/${encodeURIComponent(product.id)}/archive`,
		options: { method: "POST", body: { revision: product.revision } },
	});
});
test("shelves merge only within adjacent matching zones and mock paths can pass below storage", () => {
	const cells: Cell[] = [
		{ x: 0, y: 0, type: "unload" },
		{ x: 1, y: 0, type: "storage" },
		{ x: 2, y: 0, type: "cold" },
		{ x: 3, y: 0, type: "load" },
		{ x: 1, y: 1, type: "storage" },
		{ x: 1, y: 3, type: "storage" },
	];
	expect(
		storageBlocks(cells)
			.map((b) => b.length)
			.sort(),
	).toEqual([1, 1, 2]);
	expect(
		findWarehousePath(cells, [requiredAt(cells, 0)], [requiredAt(cells, 3)]),
	).toEqual([]);
	const path = findWarehousePath(
		cells,
		[requiredAt(cells, 0)],
		[requiredAt(cells, 3)],
		undefined,
		true,
	);
	expect(path.map((c) => c.type)).toEqual([
		"unload",
		"storage",
		"cold",
		"load",
	]);
	const track = prepareRobotMotionTrack({
		target: requiredAt(cells, 3),
		path,
		startedAt: 0,
		duration: 3000,
	});
	expect(robotMotionPosition(track, 1500)).toEqual({ x: 1.5, y: 0 });
});
test("cabinet values remain warehouse specific in REST fixtures", () => {
	const north = warehouseFromDto(
		warehouseDto.parse(payload("North: Warehouse details")),
	);
	expect(north.id).not.toBe(base.id);
	expect(north.cabinet?.placement).toBe("fifo");
	expect(base.cabinet?.placement).toBe("fefo");
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

test("order detail marks only products whose catalogue price is missing, preserving their category", () => {
	const product = requiredAt(base.products, 0);
	const order = requiredAt(base.orders, 0);
	const presentation = getOrderPresentation(
		{
			...order,
			lines: [
				{ product: "unknown", quantity: 2, expires: "" },
				{ product: "free", quantity: 3, expires: "" },
				{ product: "priced", quantity: 4, expires: "" },
			],
		},
		{
			products: [
				{ ...product, id: "unknown", category: "a", price: "" },
				{ ...product, id: "free", category: "a", price: "0" },
				{ ...product, id: "priced", category: "b", price: "2,50" },
			],
		},
	);
	expect(
		presentation.lines
			.filter((line) => line.unpriced)
			.map((line) => ({ product: line.product, category: line.category })),
	).toEqual([{ product: "unknown", category: "a" }]);
});
