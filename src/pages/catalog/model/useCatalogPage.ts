import { useState } from "react";
import type {
	Category,
	CommandExecutor,
	Product,
	Warehouse,
} from "@/entities/warehouse";

export type Dialog =
	| { type: "product"; item?: Product }
	| { type: "category"; item?: Category };

export function useCatalogPage(warehouse: Warehouse, command: CommandExecutor) {
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<"products" | "categories">("products");
	const searchQuery = search.trim().toLowerCase();
	const categoryNames = new Map(
		warehouse.categories.map((category) => [category.id, category.name]),
	);
	const productCounts = new Map<string, number>();

	for (const product of warehouse.products) {
		productCounts.set(
			product.category,
			(productCounts.get(product.category) || 0) + 1,
		);
	}

	function toggleProductArchive(productId: string) {
		const product = warehouse.products.find(
			(product) => product.id === productId,
		);

		if (!product) {
			return;
		}

		return command("product", { ...product, archived: !product.archived });
	}

	const visibleProducts = warehouse.products
		.filter((product) =>
			(product.name + product.sku).toLowerCase().includes(searchQuery),
		)
		.map((product) => ({
			...product,
			categoryName: categoryNames.get(product.category),
		}));

	const visibleCategories = warehouse.categories
		.filter((category) => category.name.toLowerCase().includes(searchQuery))
		.map((category) => ({
			...category,
			productCount: productCounts.get(category.id) || 0,
		}));

	return {
		empty: !(tab === "products" ? warehouse.products : warehouse.categories)
			.length,
		toggleProductArchive,
		visibleProducts,
		visibleCategories,
		tab,
		setTab,
		search,
		setSearch,
	};
}
