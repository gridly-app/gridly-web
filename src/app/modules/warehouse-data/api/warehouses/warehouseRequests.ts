import type { WarehouseInput } from "@/domain/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import { readWarehouseCollection } from "../repositories/readWarehouseCollection";
import { warehouseFromDto } from "../repositories/restMappers";
import type { WarehouseMutationRequests } from "../repositories/warehouseMutationRequests";
import { createdWarehouseDto, warehouseDto } from "./warehouseDto";

export async function readWarehouses(
	http: HttpClient,
	signal: AbortSignal | undefined,
) {
	const warehouses = await readWarehouseCollection(
		http,
		"/warehouses?include_summary=true",
		warehouseDto,
		signal,
	);

	return warehouses.map(warehouseFromDto);
}

export async function createWarehouse(
	mutations: WarehouseMutationRequests,
	warehouse: WarehouseInput,
	operationId: string | undefined,
) {
	const response = await mutations.send("/warehouses", {
		method: "POST",
		idempotencyKey: operationId,
		body: {
			name: warehouse.name,
			width: warehouse.width,
			height: warehouse.height,
			time_zone: warehouse.timezone,
		},
	});

	return parseResponse(createdWarehouseDto, response);
}
