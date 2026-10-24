import type { CommandHandlers } from "./commandHandlers";

export const catalogHandlers: Pick<CommandHandlers, "product" | "category"> = {
	product(warehouse, product) {
		const oldProduct = warehouse.products.find((p) => p.id === product.id);
		if (
			oldProduct &&
			(oldProduct.volume !== product.volume ||
				oldProduct.category !== product.category) &&
			(warehouse.stock.some((s) => s.product === product.id) ||
				warehouse.orders.some(
					(o) =>
						["running", "waiting"].includes(o.status) &&
						o.lines.some((l) => l.product === product.id),
				))
		)
			throw new Error(
				"Нельзя изменить объём или категорию товара с остатками или активными заказами",
			);
		if (
			warehouse.products.some(
				(p) =>
					p.id !== product.id &&
					p.sku.toLowerCase() === product.sku.toLowerCase(),
			)
		) {
			throw new Error("Артикул уже существует");
		}
		warehouse.products = warehouse.products
			.filter((p) => p.id !== product.id)
			.concat(product);
	},
	category(warehouse, category) {
		if (
			warehouse.categories.some(
				(c) =>
					c.id !== category.id &&
					c.name.toLowerCase() === category.name.toLowerCase(),
			)
		) {
			throw new Error("Категория уже существует");
		}
		const old = warehouse.categories.find((c) => c.id === category.id);

		if (
			old &&
			old.cold !== category.cold &&
			(warehouse.cells.some((cell) => cell.zone?.categoryId === category.id) ||
				warehouse.draft?.some((cell) => cell.zone?.categoryId === category.id))
		) {
			throw new Error(
				"Тип хранения нельзя изменить у категории с существующими зонами",
			);
		}
		warehouse.categories = warehouse.categories
			.filter((c) => c.id !== category.id)
			.concat(category);
	},
};
