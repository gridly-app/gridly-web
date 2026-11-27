import {
	type Order,
	type Product,
	productPrice,
	type Stock,
	stockZoneNames,
	type WarehouseView,
} from "@/domain/warehouse";

import { warehouseDay } from "./reportPeriod";

export interface UnpricedDetail {
	id: string;
	productName: string;
	quantity: number;
	source: string;
}

export type UnpricedSection = "inbound" | "outbound" | "stock" | "writeOffs";

export function reportUnpricedDetails(
	warehouse: Pick<WarehouseView<"map">, "cells" | "timezone">,
	products: ReadonlyMap<string, Product>,
	orders: Order[],
	stock: Stock[],
	writeOffs: WarehouseView<"history">["writeOffs"],
): Record<UnpricedSection, UnpricedDetail[]> {
	const zoneName = stockZoneNames(warehouse.cells);

	function productName(id: string) {
		return products.get(id)?.name ?? `Товар ${id}`;
	}

	function isUnpriced(item: { product: string; quantity: number }) {
		return (
			productPrice(products.get(item.product)?.price) === null &&
			item.quantity > 0
		);
	}

	function orderDetails(kind: Order["kind"]): UnpricedDetail[] {
		return orders
			.filter((order) => order.kind === kind)
			.flatMap((order) =>
				order.lines
					.map((line, index) => ({ line, id: `${order.id}:${index}` }))
					.filter(({ line }) => isUnpriced(line))
					.map(({ line, id }) => ({
						id,
						productName: productName(line.product),
						quantity: line.quantity,
						source: `Заказ ${order.number}`,
					})),
			);
	}

	const stockDetails = stock.filter(isUnpriced).map((item) => ({
		id: item.id,
		productName: productName(item.product),
		quantity: item.quantity,
		source: `Партия ${item.id} · ${zoneName(item)}`,
	}));
	const writeOffDetails = (writeOffs ?? [])
		.filter((item) => item.price === null && item.quantity > 0)
		.map((item) => ({
			id: item.id,
			productName: productName(item.product),
			quantity: item.quantity,
			source: `${warehouseDay(item.time, warehouse.timezone)} · ${item.reason}`,
		}));

	return {
		inbound: orderDetails("inbound"),
		outbound: orderDetails("outbound"),
		stock: stockDetails,
		writeOffs: writeOffDetails,
	};
}
