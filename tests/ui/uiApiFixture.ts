import { expect, type Page } from "@playwright/test";
import { createAdminMock } from "../../bruno/admin-mock";
import { loadMockRoutes } from "../../bruno/mock-fixture";
import { mockWarehouseDeletion } from "../../bruno/warehouse-mock";

const fixture = { routes: await loadMockRoutes() };

const permissions = [
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
const shipmentPaths = [
	"/api/v1/admin/shipment-users",
	"/api/v1/sandbox/admin/shipment-users",
	"/api/v1/warehouses/warehouse-demo/orders/order-out-2087/shipment",
];
const seed = new Map(
	fixture.routes
		.filter(
			(item) =>
				item.request.method === "GET" &&
				item.response.status === 200 &&
				(!item.rules || shipmentPaths.includes(item.request.url)) &&
				item.response.body,
		)
		.map((item) => [
			item.request.url,
			JSON.parse(item.response.body?.data || "null") as Record<string, unknown>,
		]),
);

export async function installUiApi(page: Page, hasLocalStream: boolean) {
	const adminMock = createAdminMock();
	const api = {
		mapStateReads: 0,
		mutations: 0,
		readOnly: false,
		failProduct: false,
		offlineData: false,
		failSandbox: false,
		settingsFailure: 0,
		failRobot: true,
		sandboxStarts: 0,
		sandboxStores: new Map<string, typeof seed>(),
		accountStore: structuredClone(seed),
	};
	function prepare(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(prepare);
		if (!value || typeof value !== "object") return value;
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				key === "allowed_actions"
					? api.readOnly
						? []
						: permissions
					: key === "can_write_off"
						? !api.readOnly
						: prepare(item),
			]),
		);
	}
	await page.context().route("**/api/v1/**", async (route) => {
		const request = route.request(),
			path = new URL(request.url()).pathname,
			method = request.method();
		const authorization = request.headers().authorization ?? "";
		const sandbox = api.sandboxStores.get(authorization);
		const store = sandbox ?? api.accountStore;
		const admin = await adminMock.handle(
			new Request(request.url(), {
				method,
				headers: request.headers(),
				...(request.postData() && { body: request.postData() }),
			}),
			api.accountStore,
			sandbox,
		);
		if (admin) {
			await route.fulfill({
				status: admin.status,
				headers: Object.fromEntries(admin.headers),
				body: await admin.text(),
			});
			return;
		}

		if (path.endsWith("/map/state")) api.mapStateReads++;
		if (path.endsWith("/stream")) {
			if (hasLocalStream) await route.continue();
			else
				await route.fulfill({
					status: 503,
					json: { error: { message: "Stream unavailable" } },
				});
			return;
		}
		if (
			path.endsWith("/settings") &&
			api.settingsFailure &&
			(method === "PATCH" || api.settingsFailure === 404)
		) {
			await route.fulfill({
				status: api.settingsFailure,
				json: {
					error: {
						code: api.settingsFailure === 409 ? "STALE_REVISION" : "NOT_FOUND",
						message: "Настройки недоступны",
					},
				},
			});
			return;
		}
		if (method === "POST" && path === "/api/v1/sandbox/access") {
			if (api.failSandbox) {
				await route.fulfill({
					status: 503,
					json: { error: { message: "Тестовая ошибка запуска песочница" } },
				});
				return;
			}
			const access_token = `ui-sandbox-${++api.sandboxStarts}`;
			api.sandboxStores.set(`Bearer ${access_token}`, structuredClone(seed));
			await route.fulfill({
				status: 201,
				json: {
					...seed.get("/api/v1/sandbox/access"),
					access_id: access_token,
					access_token,
				},
			});
			return;
		}
		if (
			path.startsWith("/api/v1/sandbox/admin/") ||
			path === "/api/v1/admin/shipment-users"
		) {
			const canRead = path.startsWith("/api/v1/sandbox/")
				? !!sandbox
				: authorization === "Bearer bruno-account-token";
			const response = canRead
				? fixture.routes.find(
						(item) =>
							item.request.method === method &&
							item.request.url === path &&
							item.response.status === 200 &&
							(item.rules?.conditions ?? []).every(
								(condition) =>
									condition.target !== "query" ||
									new URL(request.url()).searchParams.get(condition.key) ===
										condition.value,
							),
					)?.response
				: undefined;
			await route.fulfill({
				status: response?.status ?? 401,
				headers: Object.fromEntries(
					(response?.headers ?? []).map(({ name, value }) => [name, value]),
				),
				body: response?.body?.data ?? "",
			});
			return;
		}
		if (path === "/api/v1/sandbox/access") {
			if (!sandbox) {
				await route.fulfill({ status: 401 });
				return;
			}
			if (method === "DELETE") {
				adminMock.closeSandbox(sandbox);
				api.sandboxStores.delete(authorization);
				await route.fulfill({ status: 204 });
				return;
			}
			await route.fulfill({
				json: {
					...seed.get(path),
					access_id: authorization.replace("Bearer ", ""),
				},
			});
			return;
		}
		if (api.offlineData && method === "GET" && path.includes("/warehouses")) {
			await route.fulfill({
				status: 503,
				json: { error: { message: "Тестовая недоступность API" } },
			});
			return;
		}
		const warehouseDeletion = mockWarehouseDeletion(
			new Request(request.url(), { method, headers: request.headers() }),
			store,
		);
		if (warehouseDeletion) {
			if (method === "DELETE") api.mutations++;
			await route.fulfill({
				status: warehouseDeletion.status,
				headers: Object.fromEntries(warehouseDeletion.headers),
				body: await warehouseDeletion.text(),
			});
			return;
		}
		if (method === "GET" && store.has(path)) {
			await route.fulfill({ status: 200, json: prepare(store.get(path)) });
			return;
		}
		const found = fixture.routes.find(
			(item) =>
				item.request.method === method &&
				new RegExp(`^${item.request.url.replace(/:[^/]+/g, "[^/]+")}$`).test(
					path,
				) &&
				(path.endsWith("/auth/login")
					? item.response.status === 200
					: !item.rules),
		);
		if (
			method !== "GET" &&
			!path.includes("/auth/") &&
			!path.includes("/sandbox/")
		) {
			api.mutations++;
			await Bun.sleep(150);
			if (api.failProduct && path.endsWith("/products")) {
				await route.fulfill({
					status: 422,
					json: {
						error: {
							message: "Тестовая ошибка сохранения товара",
							details: {
								issues: [
									{ field: "internal_revision", message: "driver stack" },
								],
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
					allowed_actions: permissions,
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
					allowed_actions: permissions,
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
				const stock = collection.items.find(
					(item) => item.id === data.stock_id,
				);
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
		if (!found) throw new Error(`Missing UI fixture: ${method} ${path}`);
		await route.fulfill({
			status: found.response.status,
			contentType: "application/json",
			body: found.response.body?.data || "",
		});
	});

	return api;
}
