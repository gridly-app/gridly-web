import type { WarehouseCommand } from "@/domain/warehouse";
import { UserError } from "@/shared/lib";
import { requireRevision, type RestCommandContext } from "../commands/context";

export async function saveProduct(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "product" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const product = command.value;
	const old = warehouse.products.find((x) => x.id === product.id);

	if (product.id && !old) {
		throw new UserError("Товар больше не доступен. Обновите каталог.");
	}

	if (old && product.archived && !old.archived) {
		await send(`/products/${encodeURIComponent(old.id)}/archive`, {
			revision: requireRevision(product.revision ?? old.revision),
		});
		return;
	}

	await send(
		old ? `/products/${encodeURIComponent(old.id)}` : "/products",
		{
			...(old
				? { revision: requireRevision(product.revision ?? old.revision) }
				: {}),
			name: product.name,
			is_archived: !!product.archived,
			sku: product.sku,
			category_id: product.category,
			unit_volume: Number(product.volume),
			price: product.price.trim() ? Number(product.price) : null,
			has_shelf_life: product.shelf > 0,
			default_shelf_life_days: product.shelf || null,
		},
		old ? "PATCH" : "POST",
	);
}

export async function saveCategory(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "category" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const category = command.value;
	const id = category.id;
	const old = warehouse.categories.find((entry) => entry.id === id);

	await send(
		id ? `/categories/${encodeURIComponent(id)}` : "/categories",
		{
			...(id
				? { revision: requireRevision(category.revision ?? old?.revision) }
				: {}),
			name: category.name,
			storage_kind: category.cold ? "cold" : "general",
		},
		id ? "PATCH" : "POST",
	);
}
