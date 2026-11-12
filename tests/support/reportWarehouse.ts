import { z } from "zod";
import type { Warehouse } from "@/entities/warehouse";
import {
	categoryDto,
	productDto,
} from "@/entities/warehouse/api/contracts/catalogDto";
import { stockDto } from "@/entities/warehouse/api/contracts/inventoryDto";
import { orderDto } from "@/entities/warehouse/api/contracts/orderDto";
import { warehouseDto } from "@/entities/warehouse/api/contracts/warehouseDto";
import {
	categoryFromDto,
	orderFromDto,
	productFromDto,
	stockFromDto,
	warehouseFromDto,
} from "@/entities/warehouse/api/repositories/restMappers";

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
				new URL("../../bruno/mocks/Gridly API.yml", import.meta.url),
			).text(),
		),
	);
export function payload(name: string): unknown {
	const data = fixture.routes.find((r) => r.name === name)?.response.body?.data;
	if (!data) throw new Error(`Missing fixture ${name}`);
	return JSON.parse(data);
}
function items<T>(name: string, schema: z.ZodType<T>): T[] {
	return z.object({ items: z.array(schema) }).parse(payload(name)).items;
}
export const reportWarehouse: Warehouse = {
	...warehouseFromDto(warehouseDto.parse(payload("Warehouse details"))),
	orders: items("orders", orderDto).map(orderFromDto),
	products: items("products", productDto).map(productFromDto),
	categories: items("categories", categoryDto).map(categoryFromDto),
	stock: items("inventory", stockDto).map(stockFromDto),
};
