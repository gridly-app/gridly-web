import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { RestWarehouseRepository } from "../src/entities/warehouse/api/repositories/restRepository";
import { warehouseSchema } from "../src/entities/warehouse/model/warehouse/schemas";
import { FetchHttpClient } from "../src/shared/api";

const fixtureSchema = z.object({
	routes: z.array(
		z.object({
			name: z.string(),
			request: z.object({ method: z.string(), url: z.string() }),
			response: z.object({
				status: z.number(),
				body: z
					.object({ type: z.literal("json"), data: z.string() })
					.optional(),
			}),
			rules: z.unknown().optional(),
		}),
	),
});
const fixture = fixtureSchema.parse(
	Bun.YAML.parse(
		await Bun.file(
			new URL("../bruno/mocks/Gridly API.yml", import.meta.url),
		).text(),
	),
);
const warehouseId = "warehouse-demo";

function repository() {
	const http = new FetchHttpClient(
		"http://bruno.test/api/v1",
		async (input, options) => {
			const path = new URL(String(input)).pathname;
			const method = options?.method ?? "GET";
			const route = fixture.routes.find(
				(item) =>
					!item.rules &&
					item.request.method === method &&
					item.request.url === path,
			);
			if (!route) throw new Error(`Missing Bruno fixture: ${method} ${path}`);
			return new Response(route.response.body?.data ?? null, {
				status: route.response.status,
				headers: { "Content-Type": "application/json" },
			});
		},
	);
	return new RestWarehouseRepository(http, new QueryClient());
}

test("Bruno responses satisfy the complete REST warehouse contract", async () => {
	const rest = repository();
	const list = await rest.list();
	expect(list.map((item) => item.id)).toContain(warehouseId);
	const warehouse = await rest.get(warehouseId);
	expect(warehouseSchema.safeParse(warehouse).success).toBe(true);
	expect(warehouse.products).toHaveLength(6);
	expect(warehouse.robots).toHaveLength(3);
	expect(warehouse.orders).toHaveLength(3);
	expect(warehouse.cells).toHaveLength(176);
	const order = warehouse.orders[0];
	if (!order) throw new Error("Missing order fixture");
	expect((await rest.getOrder(warehouseId, order.id)).id).toBe(order.id);
	expect((await rest.getLive(warehouseId)).layoutVersion).toBe(
		warehouse.version,
	);
});

test("static fixtures reject saving rather than reporting a change they cannot persist", async () => {
	const rest = repository();
	await rest.get(warehouseId);
	await expect(
		rest.execute(warehouseId, {
			action: "settings",
			value: { section: "name", name: "Changed" },
		}),
	).rejects.toThrow("статические примеры");
});
