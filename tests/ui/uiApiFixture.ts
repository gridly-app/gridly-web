import type { Page } from "@playwright/test";
import { createAdminMock } from "../../bruno/admin-mock";
import { loadMockRoutes } from "../../bruno/mock-fixture";
import { mockWarehouseDeletion } from "../../bruno/warehouse-mock";

import {
	handleWarehouseMutation,
	uiWarehouseActions,
} from "./uiWarehouseMutations";
import { handleSandboxAccess } from "./uiSandboxFixture";

const fixture = { routes: await loadMockRoutes() };

const shipmentPaths = [
	"/api/v1/admin/shipment-users",
	"/api/v1/admin/shipment-audit",
	"/api/v1/sandbox/admin/shipment-audit",
	"/api/v1/admin/shipment-system",
	"/api/v1/sandbox/admin/shipment-system",
	"/api/v1/sandbox/admin/shipment-users",
	"/api/v1/warehouses/warehouse-demo/orders/order-out-2087/shipment",
];
const seed = new Map<string, Record<string, unknown>>();

for (const { request, response, rules } of fixture.routes) {
	if (request.method !== "GET" || response.status !== 200 || !response.body)
		continue;
	if (rules && !shipmentPaths.includes(request.url)) continue;

	const value = JSON.parse(response.body.data || "null") as Record<
		string,
		unknown
	>;

	seed.set(request.url, value);
}

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
		const entries = Object.entries(value);
		const prepared = entries.map(([key, item]) => {
			if (key === "allowed_actions")
				return [key, api.readOnly ? [] : uiWarehouseActions];
			if (key === "can_write_off") return [key, !api.readOnly];

			return [key, prepare(item)];
		});

		return Object.fromEntries(prepared);
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
		if (path === "/api/v1/sandbox/access") {
			await handleSandboxAccess(route, seed, api, adminMock.closeSandbox);

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
			await handleWarehouseMutation(route, store, api);

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
