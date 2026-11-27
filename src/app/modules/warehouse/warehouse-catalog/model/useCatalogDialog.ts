import { useState } from "react";

import type {
	Category,
	CategoryInput,
	CommandExecutor,
	Product,
	ProductInput,
} from "@/domain/warehouse";

import type { CatalogDialogState, CatalogTab } from "./catalog";

export function useCatalogDialog(execute: CommandExecutor) {
	const [dialog, setDialog] = useState<CatalogDialogState | null>(null);

	function closeIfUnchanged() {
		setDialog((current) => (current === dialog ? null : current));
	}

	async function saveProduct(product: ProductInput) {
		await execute("product", product);
		closeIfUnchanged();
	}

	async function saveCategory(category: CategoryInput) {
		await execute("category", category);
		closeIfUnchanged();
	}

	function close() {
		setDialog(null);
	}

	function openNewItem(tab: CatalogTab) {
		setDialog(tab === "products" ? { type: "product" } : { type: "category" });
	}

	function editProduct(item: Product) {
		setDialog({ type: "product", item });
	}

	function editCategory(item: Category) {
		setDialog({ type: "category", item });
	}

	return {
		dialog,
		close,
		saveProduct,
		saveCategory,
		openNewItem,
		editProduct,
		editCategory,
	};
}
