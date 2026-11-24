import { loadMockRoutes } from "../../../bruno/mock-fixture";

const fixture = { routes: await loadMockRoutes() };
export function shipmentExample(name: string) {
	const data = fixture.routes.find((route) => route.name === name)?.response
		.body?.data;
	if (!data) throw new Error(`Missing Bruno response: ${name}`);
	return JSON.parse(data);
}
