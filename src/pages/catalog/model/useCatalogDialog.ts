import { useState } from "react";
import type { Category, CommandExecutor, Product } from "@/entities/warehouse";
import type { Dialog } from "./useCatalogPage";

export function useCatalogDialog(execute: CommandExecutor) {
	const [dialog, setDialog] = useState<Dialog | null>(null);

	async function saveProduct(product: Product) {
		await execute("product", product);
		setDialog(null);
	}

	async function saveCategory(category: Category) {
		await execute("category", category);
		setDialog(null);
	}

	return {
		dialog,
		close: () => setDialog(null),
		saveProduct,
		saveCategory,
		openNewItem: (type: "products" | "categories") =>
			setDialog(
				type === "products" ? { type: "product" } : { type: "category" },
			),
		editProduct: (item: Product) => setDialog({ type: "product", item }),
		editCategory: (item: Category) => setDialog({ type: "category", item }),
	};
}
