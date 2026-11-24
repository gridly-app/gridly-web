import type { loadWorkspaceSamples } from "./mock-fixture";

type StaticRoutes = Awaited<ReturnType<typeof loadWorkspaceSamples>>["routes"];

export function staticMockResponse(
	routes: StaticRoutes,
	request: Request,
	url: URL,
	body: Record<string, unknown> | undefined,
	isSandbox: boolean,
) {
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
		const conditions = item.rules?.conditions.map(({ target, key, value }) => {
			if (target === "header")
				return (
					(key === "authorization" && isSandbox
						? "Bearer bruno-sandbox-token"
						: request.headers.get(key)) === value
				);
			if (target === "query") return url.searchParams.get(key) === value;
			return body?.[key] === value;
		});
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
}
