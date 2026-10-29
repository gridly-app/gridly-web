import { useState } from "react";
import type {
	Category,
	CategoryInput,
	CommandExecutor,
	Product,
	ProductInput,
} from "@/entities/warehouse";
import type { CatalogDialogState, CatalogTab } from "./catalog";

export function useCatalogDialog(execute: CommandExecutor) {
	const [dialog, setDialog] = useState<CatalogDialogState | null>(null);

	async function saveProduct(product: ProductInput) {
		await execute("product", product);
		setDialog((current) => (current === dialog ? null : current));
	}

	async function saveCategory(category: CategoryInput) {
		await execute("category", category);
		setDialog((current) => (current === dialog ? null : current));
	}

	return {
		dialog,
		close: () => setDialog(null),
		saveProduct,
		saveCategory,
		openNewItem: (type: CatalogTab) =>
			setDialog(
				type === "products" ? { type: "product" } : { type: "category" },
			),
		editProduct: (item: Product) => setDialog({ type: "product", item }),
		editCategory: (item: Category) => setDialog({ type: "category", item }),
	};
}
