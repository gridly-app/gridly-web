import type { Route } from "@playwright/test";

type FixtureStore = Map<string, Record<string, unknown>>;

export async function handleSandboxAccess(
	route: Route,
	seed: FixtureStore,
	api: {
		failSandbox: boolean;
		sandboxStarts: number;
		sandboxStores: Map<string, FixtureStore>;
	},
	closeSandbox: (store: FixtureStore) => void,
) {
	const request = route.request();
	const path = new URL(request.url()).pathname;
	const method = request.method();
	const authorization = request.headers().authorization ?? "";
	const sandbox = api.sandboxStores.get(authorization);

	if (method === "POST") {
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
	if (!sandbox) {
		await route.fulfill({
			status: 401,
			json: { error: { code: "SESSION_EXPIRED" } },
		});
		return;
	}
	if (method === "DELETE") {
		closeSandbox(sandbox);
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
