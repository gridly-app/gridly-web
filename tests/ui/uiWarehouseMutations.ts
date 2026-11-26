import { expect, type Route } from "@playwright/test";

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
	store: Map<string, Record<string, unknown>>,
	api: {
		mutations: number;
		failProduct: boolean;
		failRobot: boolean;
		allowWarehouseCreation: boolean;
		allowOrderCreation: boolean;
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
		await route.fulfill({ status: 201, json: { id: product.id } });
		return;
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
	if (method === "POST" && path.endsWith("/inventory/write-offs")) {
		const data = request.postDataJSON() as {
			stock_id: string;
			quantity: number;
			reason: string;
		};
		const collection = store.get(path.replace("/write-offs", "")) as {
			items: {
				id: string;
				product_id: string;
				quantity: number;
				available_quantity: number;
			}[];
		};
		const stock = collection.items.find((item) => item.id === data.stock_id);
		if (!stock) throw new Error("Missing write-off stock fixture");
		stock.quantity -= data.quantity;
		stock.available_quantity -= data.quantity;
		const warehousePath = path.replace("/inventory/write-offs", "");
		const warehouse = store.get(warehousePath);
		if (!warehouse) throw new Error("Missing write-off warehouse fixture");
		const entry = {
			id: "write-off-ui",
			product: stock.product_id,
			quantity: data.quantity,
			time: new Date().toISOString(),
			reason: data.reason,
			price: null,
		};
		const entries = Array.isArray(warehouse.write_offs)
			? warehouse.write_offs
			: [];
		warehouse.write_offs = [...entries, entry];

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
	if (method === "POST" && /\/layout\/(commit|resize)$/.test(path)) {
		const warehousePath = path.replace(/\/layout\/(commit|resize)$/, "");
		const layout = store.get(`${warehousePath}/layout`);
		const warehouse = store.get(warehousePath);
		const state = store.get(`${warehousePath}/map/state`);
		if (!layout || !warehouse || !state)
			throw new Error("Missing published layout fixtures");
		const body = request.postDataJSON();
		expect(body.base_version).toBe(warehouse.published_version);
		expect(request.headers()["idempotency-key"]).toBeTruthy();
		const version = Number(warehouse.published_version) + 1;
		if (path.endsWith("/resize")) {
			const { width, height } = body;
			const cells = (layout.cells as { x: number; y: number }[]).filter(
				(cell) => cell.x < width && cell.y < height,
			);

			Object.assign(layout, { width, height, version, cells });
			Object.assign(warehouse, { width, height });
		} else {
			const cells = (
				body.cells as {
					x: number;
					y: number;
					kind: string;
					capacity_volume?: number;
					zone: {
						id?: string;
						client_id?: string;
						name: string;
						category_id: string;
					} | null;
				}[]
			).map(({ zone, ...cell }) => ({
				...cell,
				capacity_volume: cell.capacity_volume ?? 0,
				...(zone
					? {
							zone: {
								id: zone.id ?? zone.client_id,
								name: zone.name,
								categoryId: zone.category_id,
							},
						}
					: {}),
			}));

			Object.assign(layout, { version, cells, routes: body.routes });
		}

		Object.assign(warehouse, { published_version: version });
		Object.assign(state, { layout_version: version });

		await route.fulfill({ status: 204 });
		return;
	}
	if (path.endsWith("/orders") && method === "POST") {
		if (api.allowOrderCreation) {
			const collection = store.get(path) as { items: unknown[]; total: number };
			const id = "order-ui-created";
			const order = {
				...request.postDataJSON(),
				id,
				number: "UI-NEW-ORDER",
				created_at: "2026-11-12T00:00:00Z",
				status: "draft",
				revision: 1,
				allowed_actions: ["start"],
			};

			collection.items.unshift(order);
			collection.total++;
			store.set(`${path}/${id}`, order);

			await route.fulfill({ status: 201, json: { id } });
			return;
		}

		await route.fulfill({
			status: 422,
			json: { error: { message: "Тестовая ошибка создания заказа" } },
		});
		return;
	}
	if (path === "/api/v1/warehouses" && method === "POST") {
		if (api.allowWarehouseCreation) {
			const id = "warehouse-ui-created";
			const template = `${path}/warehouse-demo`;
			const created = `${path}/${id}`;
			const warehouse = store.get(template);
			if (!warehouse) throw new Error("Missing warehouse fixture");
			const newWarehouse = {
				...warehouse,
				...request.postDataJSON(),
				id,
				published_version: 0,
			};
			const list = store.get(path) as { items: unknown[]; total: number };

			list.items.push(newWarehouse);
			list.total++;
			store.set(created, newWarehouse);
			store.set(`${created}/map/state`, {
				warehouse_id: id,
				layout_version: 0,
				state_version: "0",
				tick: "0",
				robots: [],
			});

			for (const resource of [
				"categories",
				"products",
				"orders",
				"inventory",
				"robots",
				"events",
			]) {
				store.set(`${created}/${resource}`, { items: [], total: 0 });
			}

			await route.fulfill({ status: 201, json: { id } });
			return;
		}

		await route.fulfill({
			status: 422,
			json: { error: { message: "Тестовая ошибка создания склада" } },
		});
		return;
	}
	await route.fulfill({
		status: 501,
		json: {
			error: {
				code: "MISSING_TEST_ROUTE",
				message: `Unexpected mutation: ${method} ${path}`,
			},
		},
	});
}
