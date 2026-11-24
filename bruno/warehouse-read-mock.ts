import type { MockStore } from "./mock-http";

const orderLimit = 1000;
const eventPageSize = 100;

export function readWarehouseSample(
	request: Request,
	url: URL,
	store: MockStore,
) {
	if (request.method === "GET" && !request.headers.has("x-gridly-scenario")) {
		const warehouseRead =
			/^\/api\/v1\/warehouses(?:\/[^/]+(?:\/(?:layout(?:\/draft)?|map\/state|robots|categories|products|inventory|orders(?:\/[^/]+)?|events|settings))?)?$/.test(
				url.pathname,
			);
		const sample = warehouseRead && store.get(url.pathname);

		if (sample === null && url.pathname.endsWith("/layout/draft"))
			return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

		if (
			/\/orders$/.test(url.pathname) &&
			sample &&
			typeof sample === "object" &&
			"items" in sample &&
			Array.isArray(sample.items) &&
			sample.items.length > orderLimit
		) {
			return Response.json(
				{
					error: {
						code: "ORDER_LIST_LIMIT_EXCEEDED",
						details: { limit: orderLimit, total: sample.items.length },
					},
				},
				{ status: 422 },
			);
		}
		if (sample) {
			if (
				/\/events$/.test(url.pathname) &&
				typeof sample === "object" &&
				"items" in sample &&
				Array.isArray(sample.items)
			) {
				const { items } = sample;
				const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
				const limit = Math.max(
					1,
					Number(url.searchParams.get("limit")) || eventPageSize,
				);
				return Response.json({
					items: items.slice(offset, offset + limit),
					total: items.length,
				});
			}
			return Response.json(sample);
		}
	}
}
