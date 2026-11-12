import { type Order, productPrice, type Warehouse } from "@/entities/warehouse";

import { type ReportFilters, warehouseDay } from "./reportPeriod";
import { reportUnpricedDetails } from "./reportUnpricedDetails";

export { productPrice } from "@/entities/warehouse";
export {
	previousPeriod,
	type ReportFilters,
	shiftDay,
	warehouseDay,
} from "./reportPeriod";
export type { UnpricedDetail, UnpricedSection } from "./reportUnpricedDetails";

export const defaultCabinet: NonNullable<Warehouse["cabinet"]> = {
	location: "",
	placement: "fefo" as const,
	allowMixedCategories: false,
	reserveOnStart: true,
	lowStockThreshold: 10,
};
export function buildReport(w: Warehouse, filters: ReportFilters) {
	const products = new Map(w.products.map((p) => [p.id, p]));
	const inPeriod = (date: string) => {
		if (!Number.isFinite(Date.parse(date))) return false;
		const day = warehouseDay(date, w.timezone);
		return day >= filters.from && day <= filters.to;
	};
	const orders = w.orders
		.filter(
			(o) =>
				inPeriod(o.created) &&
				(filters.kind === "all" || o.kind === filters.kind) &&
				(filters.status === "all" || o.status === filters.status),
		)
		.map((o) => ({
			...o,
			lines: o.lines.filter(
				(l) =>
					filters.category === "all" ||
					products.get(l.product)?.category === filters.category,
			),
		}))
		.filter((o) => o.lines.length);
	const amount = (list: Order[]) => {
		let value = 0,
			known = 0,
			unknown = 0;
		for (const o of list)
			for (const l of o.lines) {
				const price = productPrice(products.get(l.product)?.price);
				if (price === null) unknown += l.quantity;
				else {
					value += price * l.quantity;
					known += l.quantity;
				}
			}
		return { value, known, unknown };
	};
	const series = new Map<
		string,
		{ day: string; inbound: number; outbound: number }
	>();
	for (const o of orders) {
		const day = warehouseDay(o.created, w.timezone);
		const bucket = series.get(day) ?? { day, inbound: 0, outbound: 0 };
		bucket[o.kind] += o.lines.reduce((n, l) => n + l.quantity, 0);
		series.set(day, bucket);
	}
	const stock = w.stock.filter(
		(s) =>
			filters.category === "all" ||
			products.get(s.product)?.category === filters.category,
	);
	let stockValue = 0,
		unpricedStock = 0;
	for (const s of stock) {
		const price = productPrice(products.get(s.product)?.price);
		if (price === null) unpricedStock += s.quantity;
		else stockValue += price * s.quantity;
	}
	const writeOffs = w.writeOffs?.filter(
		(s) =>
			inPeriod(s.time) &&
			(filters.category === "all" ||
				products.get(s.product)?.category === filters.category),
	);

	return {
		unpricedDetails: reportUnpricedDetails(
			w,
			products,
			orders,
			stock,
			writeOffs,
		),
		orders,
		series: [...series.values()].sort((a, b) => a.day.localeCompare(b.day)),
		inbound: amount(orders.filter((o) => o.kind === "inbound")),
		outbound: amount(orders.filter((o) => o.kind === "outbound")),
		completed: orders.filter((o) =>
			["received", "shipped", "received_with_losses", "completed"].includes(
				o.status,
			),
		).length,
		active: orders.filter(
			(o) =>
				![
					"received",
					"shipped",
					"received_with_losses",
					"completed",
					"cancelled",
					"canceled",
				].includes(o.status),
		).length,
		cancelled: orders.filter((o) =>
			["cancelled", "canceled"].includes(o.status),
		).length,
		stockQuantity: stock.reduce((n, s) => n + s.quantity, 0),
		reserved: stock.reduce((n, s) => n + (s.reserved ?? 0), 0),
		stockValue,
		unpricedStock,
		writeOffQuantity: writeOffs?.reduce((n, s) => n + s.quantity, 0),
		writeOffValue: writeOffs?.reduce(
			(n, s) => n + (s.price ?? 0) * s.quantity,
			0,
		),
		unpricedWriteOffs: writeOffs?.reduce(
			(n, s) => n + (s.price === null ? s.quantity : 0),
			0,
		),
	};
}
