import { useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import type { CatalogCategory, CatalogProduct, CatalogTab } from "./catalog";

export function useCatalogPage(warehouse: Warehouse, command: CommandExecutor) {
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<CatalogTab>("products");
	const searchQuery = search.trim().toLowerCase();
	const categoryNames = new Map(
		warehouse.categories.map((category) => [category.id, category.name]),
	);

	function toggleProductArchive(productId: string) {
		const product = warehouse.products.find(
			(product) => product.id === productId,
		);

		if (!product) {
			return;
		}

		return command("product", { ...product, archived: !product.archived });
	}

	const visibleProducts: CatalogProduct[] = warehouse.products
		.filter((product) =>
			(product.name + product.sku).toLowerCase().includes(searchQuery),
		)
		.map((product) => ({
			...product,
			categoryName: categoryNames.get(product.category),
		}));

	const visibleCategories: CatalogCategory[] = warehouse.categories
		.filter((category) => category.name.toLowerCase().includes(searchQuery))
		.map((category) => ({
			...category,
			productCount: category.productCount,
		}));

	return {
		empty: !(tab === "products" ? warehouse.products : warehouse.categories)
			.length,
		noResults:
			(tab === "products" ? visibleProducts : visibleCategories).length === 0,
		toggleProductArchive,
		visibleProducts,
		visibleCategories,
		tab,
		setTab,
		search,
		setSearch,
	};
}
