import { z } from "zod";
import {
	categoryDto,
	productDto,
} from "@/app/modules/warehouse-data/api/catalog/catalogDto";
import { stockDto } from "@/app/modules/warehouse-data/api/inventory/inventoryDto";
import { orderDto } from "@/app/modules/warehouse-data/api/orders/orderDto";
import {
	categoryFromDto,
	orderFromDto,
	productFromDto,
	stockFromDto,
	warehouseFromDto,
} from "@/app/modules/warehouse-data/api/repositories/restMappers";
import { warehouseDto } from "@/app/modules/warehouse-data/api/warehouses/warehouseDto";
import type { WarehouseView } from "@/domain/warehouse";

import { loadMockRoutes } from "../../bruno/mock-fixture";

const fixture = { routes: await loadMockRoutes() };
export function payload(name: string): unknown {
	const data = fixture.routes.find((r) => r.name === name)?.response.body?.data;
	if (!data) throw new Error(`Missing fixture ${name}`);
	return JSON.parse(data);
}
function items<T>(name: string, schema: z.ZodType<T>): T[] {
	return z.object({ items: z.array(schema) }).parse(payload(name)).items;
}
export const reportWarehouse: WarehouseView<
	"map" | "robots" | "catalog" | "orders" | "inventory" | "history"
> = {
	...warehouseFromDto(
		warehouseDto.parse(payload("Карточка склада (Центральный)")),
	),
	cells: [],
	draft: null,
	robots: [],
	events: [],
	orders: items("Список заказов (Центральный)", orderDto).map(orderFromDto),
	products: items("Список товаров (Центральный)", productDto).map(
		productFromDto,
	),
	categories: items("Список категорий (Центральный)", categoryDto).map(
		categoryFromDto,
	),
	stock: items("Список остатков (Центральный)", stockDto).map(stockFromDto),
};
