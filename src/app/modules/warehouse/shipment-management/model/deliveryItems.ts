import type { Order, Product } from "@/domain/warehouse";

import type { WorkingShipment } from "../api/shipment.dto";

export type DeliveryItem = Pick<
	WorkingShipment["items"][number],
	"order_line_id" | "sku" | "name" | "quantity" | "unit"
>;

export function orderDeliveryItems(
	order: Order,
	products: Product[],
): DeliveryItem[] {
	return order.lines.map((line, index) => {
		const product = products.find((item) => item.id === line.product);

		return {
			order_line_id: line.id ?? String(index),
			sku: product?.sku ?? "",
			name: product?.name ?? line.product,
			quantity: line.quantity,
			unit: "pcs",
		};
	});
}
