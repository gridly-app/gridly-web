import { z } from "zod";
import type { MockStore } from "./admin-mock";

const warehousesPath = "/api/v1/warehouses";
const warehouseIdentity = z.object({ id: z.string(), revision: z.number() });
const warehouseWithActions = warehouseIdentity
	.extend({ allowed_actions: z.array(z.string()).optional() })
	.passthrough();
const warehouseList = z.object({
	items: z.array(warehouseWithActions),
});
const deletedWarehouses = new WeakMap<MockStore, Set<string>>();

export function mockWarehouseDeletion(request: Request, store: MockStore) {
	const path = new URL(request.url).pathname;
	const match = path.match(/^\/api\/v1\/warehouses\/([^/]+)(?:\/|$)/);
	if (!match) return;

	const id = decodeURIComponent(match[1] ?? "");
	const warehousePath = `${warehousesPath}/${id}`;
	const isDeleting = request.method === "DELETE" && path === match[0];
	if (!isDeleting) {
		if (deletedWarehouses.get(store)?.has(id))
			return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
		return;
	}

	const warehouse = warehouseIdentity.safeParse(store.get(warehousePath));
	if (!warehouse.success)
		return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
	if (request.headers.get("If-Match") !== `"${warehouse.data.revision}"`)
		return Response.json(
			{ error: { code: "STALE_REVISION" } },
			{ status: 409 },
		);

	const list = warehouseList.parse(store.get(warehousesPath));
	const items = list.items.filter((item) => item.id !== id);
	store.set(warehousesPath, { items, total: items.length });
	for (const key of store.keys()) {
		if (key === warehousePath || key.startsWith(`${warehousePath}/`))
			store.delete(key);
	}
	const deleted = deletedWarehouses.get(store) ?? new Set<string>();
	deleted.add(id);
	deletedWarehouses.set(store, deleted);
	return new Response(null, { status: 204 });
}

export function allowMockWarehouseDeletion(store: MockStore) {
	const list = warehouseList.parse(store.get(warehousesPath));
	const items = list.items.map((warehouse) => {
		const path = `${warehousesPath}/${warehouse.id}`;
		const detail = warehouseWithActions.parse(store.get(path));
		store.set(path, {
			...detail,
			allowed_actions: [
				...new Set([...(detail.allowed_actions ?? []), "delete"]),
			],
		});
		return {
			...warehouse,
			allowed_actions: [
				...new Set([...(warehouse.allowed_actions ?? []), "delete"]),
			],
		};
	});
	store.set(warehousesPath, { items, total: items.length });
}
