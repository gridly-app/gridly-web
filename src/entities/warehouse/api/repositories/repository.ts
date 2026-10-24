import { z } from "zod";
import type { HttpClient } from "@/shared/api";
import { parseResponse } from "@/shared/api";
import type { WarehouseCommand } from "../../model/commands/commands";
import type {
	Order,
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";
import {
	warehouseLiveStateSchema,
	warehouseSchema,
} from "../../model/warehouse/schemas";

export interface WarehouseRepository {
	networkMode?: "online" | "always";
	getLive?(id: string, signal?: AbortSignal): Promise<WarehouseLiveState>;
	clear?(): void;
	getOrder?(id: string, orderId: string, signal?: AbortSignal): Promise<Order>;
	list(signal?: AbortSignal): Promise<Warehouse[]>;
	get(id: string, signal?: AbortSignal): Promise<Warehouse>;
	create(warehouse: Warehouse): Promise<Warehouse>;
	execute(id: string, command: WarehouseCommand): Promise<Warehouse>;
}

export class HttpWarehouseRepository implements WarehouseRepository {
	constructor(private readonly http: HttpClient) {}

	async list(signal?: AbortSignal) {
		return parseResponse(
			z.object({ items: z.array(warehouseSchema) }),
			await this.http.request("/warehouses", { signal }),
		).items;
	}

	async get(id: string, signal?: AbortSignal) {
		return parseResponse(
			warehouseSchema,
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/snapshot`,
				{ signal },
			),
		);
	}

	async getLive(id: string, signal?: AbortSignal) {
		return parseResponse(
			warehouseLiveStateSchema,
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/map-state`,
				{ signal },
			),
		);
	}

	async create(warehouse: Warehouse) {
		return parseResponse(
			warehouseSchema,
			await this.http.request("/warehouses", {
				method: "POST",
				body: warehouse,
			}),
		);
	}

	async execute(id: string, command: WarehouseCommand) {
		return parseResponse(
			warehouseSchema,
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/commands`,
				{
					method: "POST",
					body: command,
				},
			),
		);
	}
}
