import { useState } from "react";

import {
	type CommandExecutor,
	productOccupancy,
	type Stock,
} from "@/domain/warehouse";

import type { CatalogProduct, CatalogTab } from "./catalog";
import type { CatalogWarehouse } from "./warehouseResources";

function matchesStatus(status: string, isArchived: boolean | undefined) {
	return status === "all" || (status === "archived") === Boolean(isArchived);
}

function groupStockByProduct(stock: Stock[]) {
	const stockByProduct = new Map<string, Stock[]>();

	for (const item of stock) {
		const items = stockByProduct.get(item.product) ?? [];

		items.push(item);
		stockByProduct.set(item.product, items);
	}

	return stockByProduct;
}

export function useCatalogPage(
	warehouse: CatalogWarehouse,
	command: CommandExecutor,
) {
	const [status, setStatus] = useState("all");
	const [category, setCategory] = useState("all");
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<CatalogTab>("products");
	const searchQuery = search.trim().toLowerCase();
	const categoryNames = new Map(
		warehouse.categories.map((item) => [item.id, item.name]),
	);
	const stockByProduct = groupStockByProduct(warehouse.stock);

	function toggleProductArchive(productId: string) {
		const product = warehouse.products.find((item) => item.id === productId);

		if (!product) return;

		return product.archived
			? command("product", { ...product, archived: false })
			: command("archiveProduct", product.id);
	}

	const visibleProducts: CatalogProduct[] = warehouse.products
		.filter((product) => matchesStatus(status, product.archived))
		.filter((product) => category === "all" || product.category === category)
		.filter((product) =>
			(product.name + product.sku).toLowerCase().includes(searchQuery),
		)
		.map((product) => {
			const occupancy = productOccupancy(
				product,
				stockByProduct.get(product.id) ?? [],
			);

			return {
				...product,
				categoryName: categoryNames.get(product.category),
				stockQuantity: occupancy.quantity,
				occupiedVolume: occupancy.volume,
			};
		});

	const visibleCategories = warehouse.categories
		.filter((item) => matchesStatus(status, item.archived))
		.filter((item) => item.name.toLowerCase().includes(searchQuery));

	const isProductsTab = tab === "products";
	const isEmpty =
		(isProductsTab ? warehouse.products : warehouse.categories).length === 0;
	const hasNoResults =
		(isProductsTab ? visibleProducts : visibleCategories).length === 0;

	return {
		status,
		setStatus,
		category,
		setCategory,
		search,
		setSearch,
		tab,
		setTab,
		isEmpty,
		hasNoResults,
		visibleProducts,
		visibleCategories,
		toggleProductArchive,
	};
}
