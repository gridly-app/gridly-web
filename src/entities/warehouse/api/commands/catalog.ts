import type { WarehouseCommand } from "../../model/commands/commands";
import type { RestCommandContext } from "./context";

export async function saveProduct(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "product" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const product = command.value;
	const old = warehouse.products.find((x) => x.id === product.id);

	if (old && product.archived && !old.archived) {
		await send(`/products/${encodeURIComponent(product.id ?? "")}/archive`, {
			revision: product.revision ?? old.revision,
		});
	} else {
		await send(
			`/products${old ? `/${encodeURIComponent(product.id ?? "")}` : ""}`,
			{
				...(old ? { revision: product.revision ?? old.revision } : {}),
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
}

export async function saveCategory(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "category" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const category = command.value;
	const old = warehouse.categories.find((x) => x.id === category.id);

	await send(
		`/categories${old ? `/${encodeURIComponent(category.id ?? "")}` : ""}`,
		{
			...(old ? { revision: category.revision ?? old.revision } : {}),
			name: category.name,
			storage_kind: category.cold ? "cold" : "general",
		},
		old ? "PATCH" : "POST",
	);
}
