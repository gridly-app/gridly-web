import { z } from "zod";

import { blockRoutePlanSchema } from "../src/domain/warehouse";
import {
	categoryDto,
	productDto,
} from "../src/app/modules/warehouse-data/api/catalog/catalogDto";
import { layoutDto } from "../src/app/modules/warehouse-data/api/layout/layout.dto";
import { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import type { MockStore } from "./admin-mock";

const identity = {
	id: z.string().optional(),
	client_id: z.string().optional(),
};
const category = categoryDto
	.pick({ name: true, storage_kind: true, revision: true })
	.extend(identity);
const layoutWrite = z.object({
	base_version: z.number().int().nonnegative(),
	draft_revision: z.number().int().nonnegative().optional(),
	categories: z.array(category).optional(),
	cells: z.array(
		z.object({
			x: z.number(),
			y: z.number(),
			kind: z.string(),
			capacity_volume: z.number(),
			zone: z
				.object({ ...identity, name: z.string(), category_id: z.string() })
				.nullable(),
		}),
	),
	routes: z.array(blockRoutePlanSchema),
});

type Receipt = { body: string; version: number; expiresAt: number };
const receipts = new WeakMap<MockStore, Map<string, Receipt>>();

export function mockLayoutMutation(
	store: MockStore,
	request: Request,
	body: unknown,
) {
	const path = new URL(request.url).pathname;
	const commit = path.match(/^(.*\/warehouses\/[^/]+)\/layout\/commit$/);
	const archive = path.match(
		/^(.*\/warehouses\/[^/]+)\/categories\/([^/]+)\/archive$/,
	);

	if (request.method !== "POST") return;
	if (commit?.[1]) return commitLayout(store, request, commit[1], body);
	if (archive?.[1] && archive[2])
		return archiveCategory(store, archive[1], decodeURIComponent(archive[2]));
}

function commitLayout(
	store: MockStore,
	request: Request,
	warehousePath: string,
	body: unknown,
) {
	const warehouse = warehouseDto.safeParse(store.get(warehousePath));
	const input = layoutWrite.safeParse(body);
	const key = request.headers.get("Idempotency-Key");

	if (!warehouse.success) return problem(404, "WAREHOUSE_NOT_FOUND");
	if (!key || !input.success) return problem(422, "INVALID_LAYOUT");

	const operations = receipts.get(store) ?? new Map();
	const scope = JSON.stringify([
		request.headers.get("Authorization"),
		warehousePath,
		key,
	]);
	const signature = JSON.stringify(body);
	const previous = operations.get(scope);
	const now = Date.now();

	if (previous && previous.expiresAt > now) {
		if (previous.body !== signature)
			return problem(409, "RECEIPT_BODY_MISMATCH");

		return Response.json({ version: previous.version });
	}

	const layoutPath = `${warehousePath}/layout`;
	const draftPath = `${layoutPath}/draft`;
	const draft = layoutDto.safeParse(store.get(draftPath));
	const version = warehouse.data.published_version ?? 0;

	if (
		version !== input.data.base_version ||
		(draft.success && draft.data.revision !== input.data.draft_revision)
	)
		return problem(409, "STALE_REVISION");

	const categoriesPath = `${warehousePath}/categories`;
	const categories =
		z
			.object({ items: z.array(categoryDto) })
			.safeParse(store.get(categoriesPath)).data?.items ?? [];
	const mapping = new Map<string, string>();

	for (const { id, client_id, ...values } of input.data.categories ?? []) {
		const categoryId = id ?? crypto.randomUUID();
		const existing = categories.find((item) => item.id === categoryId);

		if (client_id) mapping.set(client_id, categoryId);
		if (existing)
			Object.assign(existing, values, {
				revision: (existing.revision ?? 0) + 1,
			});
		else categories.push({ ...values, id: categoryId, revision: 1 });
	}

	const zones = new Map<string, string>();
	const cells = input.data.cells.map(({ zone, ...cell }) => {
		if (!zone) return cell;

		const { id, client_id, name, category_id } = zone;
		const zoneId = id ?? zones.get(client_id ?? "") ?? crypto.randomUUID();

		if (client_id) zones.set(client_id, zoneId);

		return {
			...cell,
			zone: {
				id: zoneId,
				name,
				categoryId: mapping.get(category_id) ?? category_id,
			},
		};
	});
	const nextVersion = version + 1;
	const { width, height } = warehouse.data;
	const layout = layoutDto.safeParse({
		version: nextVersion,
		revision: nextVersion,
		width,
		height,
		cells,
		routes: input.data.routes,
	});

	if (!layout.success) return problem(422, "INVALID_LAYOUT");

	store.set(layoutPath, layout.data);
	store.set(draftPath, null);
	store.set(categoriesPath, { items: categories, total: categories.length });
	store.set(warehousePath, {
		...warehouse.data,
		published_version: nextVersion,
	});

	const statePath = `${warehousePath}/map/state`;
	const state = store.get(statePath);

	if (state && typeof state === "object")
		store.set(statePath, { ...state, layout_version: nextVersion });

	operations.set(scope, {
		body: signature,
		version: nextVersion,
		expiresAt: now + 24 * 60 * 60 * 1000,
	});
	receipts.set(store, operations);

	return Response.json({ version: nextVersion });
}

function archiveCategory(store: MockStore, warehousePath: string, id: string) {
	const layouts = [
		store.get(`${warehousePath}/layout`),
		store.get(`${warehousePath}/layout/draft`),
	];
	const hasZones = layouts.some((layout) =>
		layoutDto
			.safeParse(layout)
			.data?.cells.some(({ zone }) => zone?.categoryId === id),
	);

	if (hasZones) return problem(409, "CATEGORY_IN_USE_BY_ZONES");

	const products = z
		.object({ items: z.array(productDto) })
		.safeParse(store.get(`${warehousePath}/products`));

	if (
		products.data?.items.some(
			({ category_id, is_archived, archived_at }) =>
				category_id === id && !is_archived && !archived_at,
		)
	)
		return problem(409, "CATEGORY_HAS_PRODUCTS");
}

function problem(status: number, code: string) {
	return Response.json({ error: { code } }, { status });
}
