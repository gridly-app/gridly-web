import { useState } from "react";
import {
	type CommandExecutor,
	productOccupancy,
	type Stock,
	type Warehouse,
} from "@/entities/warehouse";
import type { CatalogCategory, CatalogProduct, CatalogTab } from "./catalog";

export function useCatalogPage(warehouse: Warehouse, command: CommandExecutor) {
	const [status, setStatus] = useState("all");
	const [category, setCategory] = useState("all");
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

		return product.archived
			? command("product", { ...product, archived: false })
			: command("archiveProduct", product.id);
	}

	const stockByProduct = new Map<string, Stock[]>();
	for (const stock of warehouse.stock) {
		const items = stockByProduct.get(stock.product);
		if (items) items.push(stock);
		else stockByProduct.set(stock.product, [stock]);
	}

	const visibleProducts: CatalogProduct[] = warehouse.products
		.filter(
			(p) =>
				(status === "all" || (status === "archived") === !!p.archived) &&
				(category === "all" || p.category === category),
		)
		.filter((product) =>
			(product.name + product.sku).toLowerCase().includes(searchQuery),
		)
		.map((product) => ({
			...product,
			categoryName: categoryNames.get(product.category),
			stockQuantity: productOccupancy(
				product,
				stockByProduct.get(product.id) ?? [],
			).quantity,
			occupiedVolume: productOccupancy(
				product,
				stockByProduct.get(product.id) ?? [],
			).volume,
		}));

	const visibleCategories: CatalogCategory[] = warehouse.categories
		.filter((c) => status === "all" || (status === "archived") === !!c.archived)
		.filter((category) => category.name.toLowerCase().includes(searchQuery))
		.map((category) => ({
			...category,
			productCount: category.productCount,
		}));

	return {
		status,
		setStatus,
		category,
		setCategory,
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
