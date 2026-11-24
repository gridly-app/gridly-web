import { expect, type Route } from "@playwright/test";

import type { MockStore } from "../../bruno/mock-http";

export const uiWarehouseActions = [
	"create-product",
	"create-category",
	"create-robot",
	"create-inbound-order",
	"create-outbound-order",
	"edit-settings",
	"edit-inventory",
	"save-map",
	"optimize-routes",
	"resize",
	"delete",
	"edit",
];
export async function handleWarehouseMutation(
	route: Route,
	store: MockStore,
	api: {
		mutations: number;
		failProduct: boolean;
		failRobot: boolean;
	},
) {
	const request = route.request();
	const path = new URL(request.url()).pathname;
	const method = request.method();

	api.mutations++;
	await Bun.sleep(150);
	if (api.failProduct && path.endsWith("/products")) {
		await route.fulfill({
			status: 422,
			json: {
				error: {
					message: "Тестовая ошибка сохранения товара",
					details: {
						issues: [{ field: "internal_revision", message: "driver stack" }],
					},
				},
			},
		});
		return;
	}
	if (path.endsWith("/robots") && method === "POST") {
		const body = request.postDataJSON();
		expect(Number.isInteger(body.x)).toBe(true);
		expect(Number.isInteger(body.y)).toBe(true);
		expect(body.speed).toBeLessThanOrEqual(5);
		expect(body.action_ticks).toBeLessThanOrEqual(20);
		expect(body).not.toHaveProperty("initial_x");
		if (api.failRobot) {
			await route.fulfill({
				status: 400,
				json: {
					error: {
						code: "VALIDATION_ERROR",
						message: "Клетка занята другим роботом",
					},
				},
			});
			return;
		}
		const collection = store.get(path) as {
			items: unknown[];
			total: number;
		};
		collection.items.push({
			...body,
			id: "robot-ui",
			revision: 1,
			status: "idle",
			allowed_actions: uiWarehouseActions,
		});
		collection.total++;
		await route.fulfill({ status: 201, json: { id: "robot-ui" } });
		return;
	}
	if (path.endsWith("/products") && method === "POST") {
		const product = {
			...request.postDataJSON(),
			id: "product-ui",
			revision: 1,
			allowed_actions: uiWarehouseActions,
		};
		const data = store.get(path) as { items: unknown[]; total: number };
		data.items.push(product);
		data.total++;
	}
	if (
		(method === "PUT" || method === "DELETE") &&
		/\/inventory\/[^/]+$/.test(path)
	)
		throw new Error("Forbidden inventory mutation");
	if (method === "DELETE" && /\/(categories|products)\/[^/]+$/.test(path))
		throw new Error("Forbidden catalog deletion");
	if (path.endsWith("/settings") && method === "PATCH") {
		const settings = store.get(path) as {
			revision: number;
			location: string;
			low_stock_threshold: number;
		};
		const body = request.postDataJSON();
		expect(body.revision).toBe(settings.revision);
		expect(body).not.toHaveProperty("placement");
		Object.assign(settings, body, { revision: settings.revision + 1 });
		await route.fulfill({ status: 200, json: settings });
		return;
	}
	if (path.endsWith("/inventory/write-offs")) {
		const data = request.postDataJSON() as {
			stock_id: string;
			quantity: number;
		};
		const collection = store.get(path.replace("/write-offs", "")) as {
			items: { id: string; quantity: number; available_quantity: number }[];
		};
		const stock = collection.items.find((item) => item.id === data.stock_id);
		if (!stock) throw new Error("Missing write-off stock fixture");
		stock.quantity -= data.quantity;
		stock.available_quantity -= data.quantity;
		await route.fulfill({
			status: 201,
			json: {
				written_off: true,
				quantity: data.quantity,
				reason: request.postDataJSON().reason,
			},
		});
		return;
	}
	if (path.endsWith("/layout/commit")) {
		await route.fulfill({ status: 204 });
		return;
	}
	if (path.endsWith("/orders") && method === "POST") {
		await route.fulfill({
			status: 422,
			json: { error: { message: "Тестовая ошибка создания заказа" } },
		});
		return;
	}
	if (path === "/api/v1/warehouses" && method === "POST") {
		await route.fulfill({
			status: 422,
			json: { error: { message: "Тестовая ошибка создания склада" } },
		});
		return;
	}
	await route.fulfill({ status: 204 });
	return;
}
