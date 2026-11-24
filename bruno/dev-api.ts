import { createAdminMock } from "./admin-mock";
import { mockLayoutMutation } from "./layout-mock";
import { loadWorkspaceSamples } from "./mock-fixture";
import {
	allowMockWarehouseDeletion,
	mockWarehouseDeletion,
} from "./warehouse-mock";

import { createSandboxMock } from "./sandbox-mock";
import { staticMockResponse } from "./static-mock-response";
import { readWarehouseSample } from "./warehouse-read-mock";

const { routes, store: account } = await loadWorkspaceSamples();
allowMockWarehouseDeletion(account);
const admin = createAdminMock({ seedLinks: true });
const sandbox = createSandboxMock(structuredClone(account), admin.closeSandbox);
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: Number(process.env.GRIDLY_MOCK_PORT ?? 4000),
	async fetch(request) {
		const url = new URL(request.url);
		const authorization = request.headers.get("Authorization");
		const sandboxResponse = sandbox.handle(
			request,
			url.pathname,
			authorization,
		);

		if (sandboxResponse) return sandboxResponse;

		const sandboxAccess = sandbox.get(authorization);

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
		if (sandboxAccess || authorization === "Bearer bruno-account-token") {
			const layout = mockLayoutMutation(store, request, body);

			if (layout) return layout;
		}

		const sample = readWarehouseSample(request, url, store);

		if (sample) return sample;

		const response = staticMockResponse(
			routes,
			request,
			url,
			body,
			!!sandboxAccess,
		);

		if (response) return response;

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
