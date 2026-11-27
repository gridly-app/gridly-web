import {
	type Order,
	type Product,
	productPrice,
	totalReserved,
} from "@/domain/warehouse";

import { type ReportFilters, warehouseDay } from "./reportPeriod";
import { reportUnpricedDetails } from "./reportUnpricedDetails";
import type { ReportWarehouse } from "./warehouseResources";

const completedStatuses = [
	"received",
	"shipped",
	"received_with_losses",
	"completed",
];
const cancelledStatuses = ["cancelled", "canceled"];

export type PriceTotals = { value: number; known: number; unknown: number };

function sumQuantity(items: readonly { quantity: number }[]) {
	return items.reduce((total, item) => total + item.quantity, 0);
}

type ProductQuantity = { product: string; quantity: number };

function priceTotals(
	items: readonly ProductQuantity[],
	products: ReadonlyMap<string, Product>,
): PriceTotals {
	const totals = { value: 0, known: 0, unknown: 0 };

	for (const item of items) {
		const price = productPrice(products.get(item.product)?.price);

		if (price === null) {
			totals.unknown += item.quantity;

			continue;
		}

		totals.value += price * item.quantity;
		totals.known += item.quantity;
	}

	return totals;
}

function orderLines(orders: Order[], kind: Order["kind"]) {
	return orders
		.filter((order) => order.kind === kind)
		.flatMap((order) => order.lines);
}

function dailySeries(orders: Order[], timezone: string) {
	const series = new Map<
		string,
		{ day: string; inbound: number; outbound: number }
	>();

	for (const order of orders) {
		const day = warehouseDay(order.created, timezone);
		const bucket = series.get(day) ?? { day, inbound: 0, outbound: 0 };

		bucket[order.kind] += sumQuantity(order.lines);
		series.set(day, bucket);
	}

	return [...series.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function buildReport(
	warehouse: ReportWarehouse,
	filters: ReportFilters,
) {
	const products = new Map(
		warehouse.products.map((product) => [product.id, product]),
	);

	function isInPeriod(time: string) {
		if (!Number.isFinite(Date.parse(time))) return false;

		const day = warehouseDay(time, warehouse.timezone);

		return day >= filters.from && day <= filters.to;
	}

	function isInCategory(productId: string) {
		return (
			filters.category === "all" ||
			products.get(productId)?.category === filters.category
		);
	}

	function matchesOrder(order: Order) {
		const matchesKind = filters.kind === "all" || order.kind === filters.kind;
		const matchesStatus =
			filters.status === "all" || order.status === filters.status;

		return isInPeriod(order.created) && matchesKind && matchesStatus;
	}

	const orders = warehouse.orders
		.filter(matchesOrder)
		.map((order) => ({
			...order,
			lines: order.lines.filter((line) => isInCategory(line.product)),
		}))
		.filter((order) => order.lines.length);
	const stock = warehouse.stock.filter((item) => isInCategory(item.product));
	const stockPrices = priceTotals(stock, products);
	const writeOffs = warehouse.writeOffs?.filter(
		(item) => isInPeriod(item.time) && isInCategory(item.product),
	);

	return {
		unpricedDetails: reportUnpricedDetails(
			warehouse,
			products,
			orders,
			stock,
			writeOffs,
		),
		orders,
		series: dailySeries(orders, warehouse.timezone),
		inbound: priceTotals(orderLines(orders, "inbound"), products),
		outbound: priceTotals(orderLines(orders, "outbound"), products),
		completed: orders.filter((order) =>
			completedStatuses.includes(order.status),
		).length,
		active: orders.filter(
			(order) =>
				![...completedStatuses, ...cancelledStatuses].includes(order.status),
		).length,
		cancelled: orders.filter((order) =>
			cancelledStatuses.includes(order.status),
		).length,
		stockQuantity: sumQuantity(stock),
		reserved: totalReserved(stock),
		stockValue: stockPrices.value,
		unpricedStock: stockPrices.unknown,
		writeOffQuantity: writeOffs ? sumQuantity(writeOffs) : undefined,
		writeOffValue: writeOffs?.reduce(
			(total, item) => total + (item.price ?? 0) * item.quantity,
			0,
		),
		unpricedWriteOffs: writeOffs
			? sumQuantity(writeOffs.filter((item) => item.price === null))
			: undefined,
	};
}

export type WarehouseReport = ReturnType<typeof buildReport>;
