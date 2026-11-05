import type { Warehouse } from "@/entities/warehouse";
import {
	type buildReport,
	type ReportFilters,
	shiftDay,
	warehouseDay,
} from "./report";

export type WarehouseReport = ReturnType<typeof buildReport>;
export interface TrafficBucket {
	from: string;
	to: string;
	inbound: number;
	outbound: number;
}
export function trafficBuckets(
	orders: WarehouseReport["orders"],
	filters: ReportFilters,
	metric: "quantity" | "orders",
	granularity: "day" | "week",
	timezone: string,
): TrafficBucket[] {
	const start = Date.parse(filters.from);
	const totalDays = Math.floor((Date.parse(filters.to) - start) / 86400000) + 1;
	if (!Number.isFinite(totalDays) || totalDays < 1) return [];
	const step = Math.max(
		granularity === "week" ? 7 : 1,
		Math.ceil(totalDays / 90),
	);
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
			(Date.parse(warehouseDay(order.created, timezone)) - start) / 86400000,
		);
		const bucket = buckets[Math.floor(offset / step)];
		if (bucket)
			bucket[order.kind] +=
				metric === "orders"
					? 1
					: order.lines.reduce((sum, line) => sum + line.quantity, 0);
	}
	return buckets;
}
export function stockCategories(warehouse: Warehouse) {
	const products = new Map(
		warehouse.products.map((product) => [product.id, product]),
	);
	const categories = new Map(
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
			label: categories.get(id) ?? "Без категории",
			quantity: 0,
		};
		item.quantity += stock.quantity;
		totals.set(id, item);
	}
	return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}
export const shortDay = (day: string) =>
	new Date(`${day}T00:00:00Z`).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	});
