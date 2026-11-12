import {
	type Order,
	type Product,
	productPrice,
	type Stock,
	stockZoneNames,
	type Warehouse,
} from "@/entities/warehouse";
import { warehouseDay } from "./reportPeriod";

export interface UnpricedDetail {
	id: string;
	productName: string;
	quantity: number;
	source: string;
}
export type UnpricedSection = "inbound" | "outbound" | "stock" | "writeOffs";

export function reportUnpricedDetails(
	warehouse: Pick<Warehouse, "cells" | "timezone">,
	products: ReadonlyMap<string, Product>,
	orders: Order[],
	stock: Stock[],
	writeOffs: Warehouse["writeOffs"],
): Record<UnpricedSection, UnpricedDetail[]> {
	const productName = (id: string) => products.get(id)?.name ?? `Товар ${id}`;
	const orderDetails = (kind: Order["kind"]): UnpricedDetail[] =>
		orders
			.filter((order) => order.kind === kind)
			.flatMap((order) =>
				order.lines.flatMap((line, index) =>
					productPrice(products.get(line.product)?.price) === null &&
					line.quantity > 0
						? [
								{
									id: `${order.id}:${index}`,
									productName: productName(line.product),
									quantity: line.quantity,
									source: `Заказ ${order.number}`,
								},
							]
						: [],
				),
			);
	const zoneName = stockZoneNames(warehouse.cells);
	return {
		inbound: orderDetails("inbound"),
		outbound: orderDetails("outbound"),
		stock: stock
			.filter(
				(item) =>
					productPrice(products.get(item.product)?.price) === null &&
					item.quantity > 0,
			)
			.map((item) => ({
				id: item.id,
				productName: productName(item.product),
				quantity: item.quantity,
				source: `Партия ${item.id} · ${zoneName(item)}`,
			})),
		writeOffs: (writeOffs ?? [])
			.filter((item) => item.price === null && item.quantity > 0)
			.map((item) => ({
				id: item.id,
				productName: productName(item.product),
				quantity: item.quantity,
				source: `${warehouseDay(item.time, warehouse.timezone)} · ${item.reason}`,
			})),
	};
}
