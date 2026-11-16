import { createAdminMock, type MockStore } from "./admin-mock";
import { loadWorkspaceSamples } from "./mock-fixture";
import {
	allowMockWarehouseDeletion,
	mockWarehouseDeletion,
} from "./warehouse-mock";

const { routes, store: account } = await loadWorkspaceSamples();
allowMockWarehouseDeletion(account);
const sandboxTemplate = structuredClone(account);
const sandboxes = new Map<string, MockStore>();
const admin = createAdminMock({ seedLinks: true });
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: Number(process.env.GRIDLY_MOCK_PORT ?? 4000),
	async fetch(request) {
		const url = new URL(request.url);
		const authorization = request.headers.get("Authorization");
		const sandboxAccess = authorization
			? sandboxes.get(authorization)
			: undefined;
		if (
			url.pathname === "/api/v1/sandbox/access" &&
			request.method === "POST"
		) {
			const token = crypto.randomUUID();
			const access = {
				access_id: token,
				access_token: token,
				initial_warehouse_id: "warehouse-demo",
			};
			const store = structuredClone(sandboxTemplate);
			store.set("/api/v1/sandbox/access", {
				access_id: access.access_id,
				initial_warehouse_id: access.initial_warehouse_id,
			});
			sandboxes.set(`Bearer ${token}`, store);
			return Response.json(access, { status: 201 });
		}
		if (url.pathname === "/api/v1/sandbox/access") {
			if (!sandboxAccess || !authorization)
				return Response.json(
					{ error: { message: "Доступ к песочнице завершён" } },
					{ status: 401 },
				);
			if (request.method === "GET")
				return Response.json(sandboxAccess.get(url.pathname));
			if (request.method === "DELETE") {
				admin.closeSandbox(sandboxAccess);
				sandboxes.delete(authorization);
				return new Response(null, { status: 204 });
			}
		}
		const result = await admin.handle(
			request.clone(),
			account,
			sandboxAccess,
			process.env.GRIDLY_MOCK_WEB_URL ?? "http://127.0.0.1:5173",
		);
		if (result) return result;
		const store = sandboxAccess ?? account;
		const isWarehouseDeletion =
			request.method === "DELETE" &&
			/^\/api\/v1\/warehouses\/[^/]+$/.test(url.pathname);
		if (
			isWarehouseDeletion &&
			!sandboxAccess &&
			authorization !== "Bearer bruno-account-token"
		)
			return Response.json(
				{ error: { code: "UNAUTHORIZED" } },
				{ status: 401 },
			);
		const deletion = mockWarehouseDeletion(request, store);
		if (deletion) return deletion;

		const body = request.headers
			.get("Content-Type")
			?.includes("application/json")
			? ((await request.json()) as Record<string, unknown>)
			: undefined;
		if (request.method === "GET" && !request.headers.has("x-gridly-scenario")) {
			const warehouseRead =
				/^\/api\/v1\/warehouses(?:\/[^/]+(?:\/(?:layout(?:\/draft)?|map\/state|robots|categories|products|inventory|orders(?:\/[^/]+)?|events|settings))?)?$/.test(
					url.pathname,
				);
			const sample = warehouseRead && store.get(url.pathname);
			if (sample) {
				if (
					/\/(orders|events)$/.test(url.pathname) &&
					typeof sample === "object" &&
					"items" in sample &&
					Array.isArray(sample.items)
				) {
					const { items } = sample;
					const offset = Math.max(
						0,
						Number(url.searchParams.get("offset")) || 0,
					);
					const limit = Math.max(
						1,
						Number(url.searchParams.get("limit")) || 100,
					);
					return Response.json({
						items: items.slice(offset, offset + limit),
						total: items.length,
					});
				}
				return Response.json(sample);
			}
		}
		for (const item of routes) {
			if (item.request.method !== request.method) continue;
			const segments = item.request.url.split("/");
			const actual = url.pathname.split("/");
			if (
				segments.length !== actual.length ||
				!segments.every(
					(part, index) => part.startsWith(":") || part === actual[index],
				)
			)
				continue;
			const conditions = item.rules?.conditions.map(
				({ target, key, value }) => {
					if (target === "header")
						return (
							(key === "authorization" && sandboxAccess
								? "Bearer bruno-sandbox-token"
								: request.headers.get(key)) === value
						);
					if (target === "query") return url.searchParams.get(key) === value;
					return body?.[key] === value;
				},
			);
			if (
				conditions &&
				!(item.rules?.operator === "OR"
					? conditions.some(Boolean)
					: conditions.every(Boolean))
			)
				continue;
			const { response } = item;
			return new Response(response.body?.data ?? null, {
				status: response.status,
				headers: Object.fromEntries(
					(response.headers ?? []).map(({ name, value }) => [name, value]),
				),
			});
		}
		return Response.json(
			{
				error: {
					code: "NOT_FOUND",
					message: "Для запроса нет тестового примера",
				},
			},
			{ status: 404 },
		);
	},
});
console.log(`Gridly Mock API: ${server.url.origin}`);
