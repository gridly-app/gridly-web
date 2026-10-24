import { delay, HttpResponse, http } from "msw";
import { z } from "zod";
import { commandHandlers } from "@/app/demo/commands";
import type { WarehouseStore } from "@/app/demo/runtime/warehouseStore";
import { WarehouseCommandService } from "@/app/demo/services/WarehouseCommandService";
import {
	type SimulationContext,
	systemContext,
} from "@/app/demo/simulation/context";
import { warehouseCommandSchema, warehouseSchema } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

function failure(error: unknown, status: number) {
	return HttpResponse.json(
		{ error: { message: errorMessage(error) } },
		{ status },
	);
}
export function warehouseHandlers(
	store: WarehouseStore,
	{
		baseUrl = "/api/v1",
		latencyMs = 120,
		context = systemContext,
	}: {
		baseUrl?: string;
		latencyMs?: number;
		context?: SimulationContext;
	} = {},
) {
	const commands = new WarehouseCommandService(store, commandHandlers, context);
	return [
		http.get(`${baseUrl}/warehouses`, async () => {
			await delay(latencyMs);

			return HttpResponse.json({ items: store.listWarehouses() });
		}),
		http.get(`${baseUrl}/warehouses/:id/snapshot`, async ({ params }) => {
			await delay(latencyMs);
			const warehouse = store.getWarehouse(String(params.id));

			return warehouse
				? HttpResponse.json(warehouse)
				: failure(Error("Склад не найден"), 404);
		}),
		http.get(`${baseUrl}/warehouses/:id/map-state`, ({ params }) => {
			const live = store.getLive(String(params.id));
			return live
				? HttpResponse.json(live)
				: failure(Error("Склад не найден"), 404);
		}),
		http.post(`${baseUrl}/warehouses`, async ({ request }) => {
			try {
				const warehouse = warehouseSchema.parse(await request.json());

				store.saveWarehouse(warehouse);

				return HttpResponse.json(warehouse);
			} catch (error) {
				return failure(
					error,
					error instanceof z.ZodError || error instanceof SyntaxError
						? 400
						: 409,
				);
			}
		}),
		http.post(
			`${baseUrl}/warehouses/:id/commands`,
			async ({ params, request }) => {
				await delay(latencyMs);
				try {
					const command = warehouseCommandSchema.parse(await request.json());

					if (
						!command ||
						typeof command.action !== "string" ||
						!Object.hasOwn(commandHandlers, command.action)
					) {
						return failure(Error("Неизвестная команда"), 400);
					}
					if (!store.getWarehouse(String(params.id))) {
						return failure(Error("Склад не найден"), 404);
					}

					return HttpResponse.json(
						commands.execute(String(params.id), command),
					);
				} catch (error) {
					return failure(
						error,
						error instanceof z.ZodError || error instanceof SyntaxError
							? 400
							: 409,
					);
				}
			},
		),
	];
}
