import { mkdir } from "node:fs/promises";
import { z } from "zod";
import { seedWorkspaceSamples } from "./workspace-samples";

const routeSchema = z.object({
	file: z.string(),
	path: z.string().optional(),
	rules: z
		.object({
			operator: z.enum(["AND", "OR"]),
			conditions: z.array(
				z.object({
					target: z.enum(["header", "query", "body"]),
					key: z.string(),
					operator: z.literal("equals"),
					value: z.string(),
				}),
			),
		})
		.optional(),
});

const requestSchema = z.object({
	info: z.object({ name: z.string() }),
	examples: z.tuple([
		z.object({
			request: z.object({ method: z.string(), url: z.url() }),
			response: z.object({
				status: z.number(),
				headers: z
					.array(z.object({ name: z.string(), value: z.string() }))
					.optional(),
				body: z
					.object({ type: z.enum(["json", "text"]), data: z.string() })
					.optional(),
			}),
		}),
	]),
});

const routeFile = new URL("./mock-routes.yml", import.meta.url);
const collection = new URL("./collections/gridly-api/", import.meta.url);

export async function loadMockRoutes() {
	const entries = z
		.array(routeSchema)
		.parse(Bun.YAML.parse(await Bun.file(routeFile).text()));
	return Promise.all(
		entries.map(async ({ file, path, rules }) => {
			const requestFile = new URL(file, collection);
			const {
				info,
				examples: [example],
			} = requestSchema.parse(
				Bun.YAML.parse(await Bun.file(requestFile).text()),
			);
			return {
				name: info.name,
				request: {
					method: example.request.method,
					url: path ?? new URL(example.request.url).pathname,
				},
				response: example.response,
				...(rules && { rules }),
			};
		}),
	);
}

export async function loadWorkspaceSamples(now = Date.now()) {
	const routes = await loadMockRoutes();
	const store = new Map<string, unknown>();
	for (const { request, response, rules } of routes) {
		if (
			request.method !== "GET" ||
			response.status !== 200 ||
			response.body?.type !== "json"
		)
			continue;
		if (
			rules?.conditions.some(
				({ target, key }) => target === "query" || key === "x-gridly-scenario",
			)
		)
			continue;
		if (!store.has(request.url))
			store.set(request.url, JSON.parse(response.body.data));
	}
	seedWorkspaceSamples(store, now);
	return { routes, store };
}

const sandboxTracking = {
	operator: "AND",
	conditions: [
		{
			target: "header",
			key: "authorization",
			operator: "equals",
			value: "Bearer bruno-sandbox-token",
		},
	],
} as const;

export async function loadBrunoMockRoutes(now = Date.now()) {
	const { routes, store } = await loadWorkspaceSamples(now);
	const served = new Set<string>();
	const mocks = routes.flatMap((route) => {
		const { request, response } = route;
		if (
			request.method !== "GET" ||
			response.status !== 200 ||
			response.body?.type !== "json"
		)
			return [route];
		const hasQueryRule = route.rules?.conditions.some(
			({ target }) => target === "query",
		);
		const sample = store.get(request.url);
		if (!sample) return [route];
		if (hasQueryRule && !request.url.endsWith("/shipment-system"))
			return [route];
		served.add(request.url);
		const mock = {
			...route,
			response: {
				...response,
				body: { ...response.body, data: JSON.stringify(sample) },
			},
		};
		if (!request.url.endsWith("/shipment")) return [mock];
		return [
			mock,
			{
				...mock,
				name: `${mock.name} · песочница`,
				rules: {
					...sandboxTracking,
					conditions: [...sandboxTracking.conditions],
				},
			},
		];
	});
	for (const [url, sample] of store) {
		if (!url.startsWith("/api/v1/warehouses/") || served.has(url)) continue;
		const isTracking = url.endsWith("/shipment");
		const headers = [{ name: "Content-Type", value: "application/json" }];
		if (isTracking) headers.push({ name: "Cache-Control", value: "no-store" });
		const route = {
			name: `Демо · ${url.slice("/api/v1/warehouses/".length)}`,
			request: { method: "GET", url },
			response: {
				status: 200,
				headers,
				body: { type: "json" as const, data: JSON.stringify(sample) },
			},
		};
		if (isTracking) {
			mocks.push({
				...route,
				rules: {
					operator: "OR",
					conditions: [
						...sandboxTracking.conditions,
						{
							...sandboxTracking.conditions[0],
							value: "Bearer bruno-account-token",
						},
					],
				},
			});
		} else {
			mocks.push(route);
		}
	}
	return mocks;
}

if (import.meta.main) {
	const routes = await loadBrunoMockRoutes();
	const directory = new URL("./mocks/", import.meta.url);
	await mkdir(directory, { recursive: true });
	const server = {
		info: { name: "Gridly API", type: "mock" },
		mock: { port: 4000 },
		routes,
	};
	await Bun.write(
		new URL("Gridly API.generated.yml", directory),
		Bun.YAML.stringify(server, null, 2),
	);
	console.log("Bruno Mock Server: Gridly API (port 4000)");
}
