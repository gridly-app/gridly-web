import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseRepository } from "@/app/modules/warehouse-data/repositories/restRepository";
import { warehouseSchema } from "@/domain/warehouse/warehouse";
import { FetchHttpClient } from "@/shared/http";
import { loadMockRoutes } from "../../bruno/mock-fixture";

const fixture = { routes: await loadMockRoutes() };
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
	expect(
		(await rest.get(warehouseId, undefined, "settings")).settings,
	).toMatchObject({
		revision: 1,
		allocationPolicy: "fefo",
		lowStockThreshold: 10,
	});
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

test("static fixtures route category and product archiving without claiming success", () => {
	for (const resource of ["categories", "products"]) {
		const path = `/api/v1/warehouses/${warehouseId}/${resource}/:id/archive`;
		const route = fixture.routes.find(
			(item) => item.request.url === path && item.request.method === "POST",
		);
		expect(route?.response.status).toBe(501);
	}
});
