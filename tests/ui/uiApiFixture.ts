import { expect, type Page } from "@playwright/test";
import { z } from "zod";

const schema = z.object({
	routes: z.array(
		z.object({
			name: z.string(),
			request: z.object({ method: z.string(), url: z.string() }),
			response: z.object({
				status: z.number(),
				body: z.object({ data: z.string() }).optional(),
			}),
			rules: z.unknown().optional(),
		}),
	),
});
const fixture = schema.parse(
	Bun.YAML.parse(
		await Bun.file(
			new URL("../../bruno/mocks/Gridly API.yml", import.meta.url),
		).text(),
	),
);

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
const seed = new Map(
	fixture.routes
		.filter(
			(item) =>
				item.request.method === "GET" &&
				item.response.status === 200 &&
				!item.rules &&
				item.response.body,
		)
		.map((item) => [
			item.request.url,
			JSON.parse(item.response.body?.data || "null") as Record<string, unknown>,
		]),
);

export async function installUiApi(page: Page, hasLocalStream: boolean) {
	const api = {
		mapStateReads: 0,
		mutations: 0,
		readOnly: false,
		failProduct: false,
		offlineData: false,
		failDemo: false,
		settingsFailure: 0,
		failRobot: true,
		demoStarts: 0,
		demoStores: new Map<string, typeof seed>(),
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
	await page.route("**/api/v1/**", async (route) => {
		const request = route.request(),
			path = new URL(request.url()).pathname,
			method = request.method();
		const authorization = request.headers().authorization ?? "";
		const demo = api.demoStores.get(authorization);
		const store = demo ?? api.accountStore;
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
		if (method === "POST" && path === "/api/v1/demo/sessions") {
			if (api.failDemo) {
				await route.fulfill({
					status: 503,
					json: { error: { message: "Тестовая ошибка запуска демо" } },
				});
				return;
			}
			const access_token = `ui-demo-${++api.demoStarts}`;
			api.demoStores.set(`Bearer ${access_token}`, structuredClone(seed));
			await route.fulfill({
				status: 201,
				json: {
					...seed.get("/api/v1/demo/session"),
					session_id: access_token,
					access_token,
				},
			});
			return;
		}
		if (path === "/api/v1/demo/session") {
			if (!demo) {
				await route.fulfill({ status: 401 });
				return;
			}
			if (method === "DELETE") {
				api.demoStores.delete(authorization);
				await route.fulfill({ status: 204 });
				return;
			}
			await route.fulfill({
				json: {
					...seed.get(path),
					session_id: authorization.replace("Bearer ", ""),
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
					? item.name === "Login — admin"
					: !item.rules),
		);
		if (
			method !== "GET" &&
			!path.includes("/auth/") &&
			!path.includes("/demo/")
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
