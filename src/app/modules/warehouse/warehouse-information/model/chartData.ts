import type { WarehouseReport } from "./report";
import {
	dayMs,
	periodDays,
	type ReportFilters,
	shiftDay,
	warehouseDay,
} from "./reportPeriod";
import type { ReportWarehouse } from "./warehouseResources";

export type TrafficMetric = "quantity" | "orders";

export type TrafficGranularity = "day" | "week";

export interface TrafficBucket {
	from: string;
	to: string;
	inbound: number;
	outbound: number;
}

const maxBuckets = 90;
const weekDays = 7;

function bucketStep(totalDays: number, granularity: TrafficGranularity) {
	const minimumStep = granularity === "week" ? weekDays : 1;

	return Math.max(minimumStep, Math.ceil(totalDays / maxBuckets));
}

export function trafficBuckets(
	orders: WarehouseReport["orders"],
	filters: ReportFilters,
	metric: TrafficMetric,
	granularity: TrafficGranularity,
	timezone: string,
): TrafficBucket[] {
	const start = Date.parse(filters.from);
	const totalDays = periodDays(filters);

	if (!Number.isFinite(totalDays) || totalDays < 1) return [];

	const step = bucketStep(totalDays, granularity);
	const buckets = Array.from(
		{ length: Math.ceil(totalDays / step) },
		(_, index) => ({
			from: shiftDay(filters.from, index * step),
			to: shiftDay(
				filters.from,
				Math.min(totalDays - 1, (index + 1) * step - 1),
			),
			inbound: 0,
			outbound: 0,
		}),
	);

	for (const order of orders) {
		const offset = Math.floor(
			(Date.parse(warehouseDay(order.created, timezone)) - start) / dayMs,
		);
		const bucket = buckets[Math.floor(offset / step)];
		const amount =
			metric === "orders"
				? 1
				: order.lines.reduce((sum, line) => sum + line.quantity, 0);

		if (bucket) bucket[order.kind] += amount;
	}

	return buckets;
}

export function stockCategories(warehouse: ReportWarehouse) {
	const products = new Map(
		warehouse.products.map((product) => [product.id, product]),
	);
	const categoryNames = new Map(
		warehouse.categories.map((category) => [category.id, category.name]),
	);
	const totals = new Map<
		string,
		{ id: string; label: string; quantity: number }
	>();

	for (const stock of warehouse.stock) {
		const id = products.get(stock.product)?.category ?? "";
		const item = totals.get(id) ?? {
			id,
			label: categoryNames.get(id) ?? "Без категории",
			quantity: 0,
		};

		item.quantity += stock.quantity;
		totals.set(id, item);
	}

	return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}
