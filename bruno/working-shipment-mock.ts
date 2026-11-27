import { z } from "zod";

import { productDto } from "../src/app/modules/warehouse-data/api/catalog/catalogDto";
import { orderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";
import { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import { workingShipmentSchema } from "../src/app/modules/warehouse/shipment-management/api/shipment.dto";
import { base, type MockStore } from "./mock-http";
import { sampleShipment } from "./shipment-samples";

export function shipmentFor(
	store: MockStore,
	warehouse: string,
	orderId: string,
	includeInbound = false,
) {
	const warehousePath = `${base}/warehouses/${warehouse}`;
	const orderPath = `${warehousePath}/orders/${orderId}`;
	const order = orderDto.safeParse(store.get(orderPath));
	if (!order.success || (!includeInbound && order.data.kind !== "outbound"))
		return undefined;
	const saved = workingShipmentSchema.safeParse(
		store.get(`${orderPath}/shipment`),
	);
	if (saved.success) return saved.data;
	const location = warehouseDto.safeParse(store.get(warehousePath));
	const products = z
		.object({ items: z.array(productDto) })
		.safeParse(store.get(`${warehousePath}/products`));
	if (!location.success || !products.success) return undefined;
	return sampleShipment(location.data, order.data, products.data.items);
}
