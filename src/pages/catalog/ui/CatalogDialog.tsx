import type { Category } from "@/entities/warehouse";
import { Modal } from "@/shared/ui";
import type { useCatalogDialog } from "../model/useCatalogDialog";
import { CategoryForm } from "./CategoryForm";
import { ProductForm } from "./ProductForm";

export interface CatalogDialogProps {
	model: Pick<
		ReturnType<typeof useCatalogDialog>,
		"dialog" | "close" | "saveProduct" | "saveCategory"
	> & { pending: boolean; categories: Category[] };
}

export function CatalogDialog({ model }: CatalogDialogProps) {
	const { dialog, close, pending, saveProduct, saveCategory, categories } =
		model;

	return (
		<>
			{dialog && (
				<Modal
					title={dialog.type === "product" ? "Товар каталога" : "Категория"}
					onClose={close}
				>
					{dialog.type === "product" ? (
						<ProductForm
							product={dialog.item}
							categories={categories}
							pending={pending}
							onSave={saveProduct}
						/>
					) : (
						<CategoryForm
							category={dialog.item}
							pending={pending}
							onSave={saveCategory}
						/>
					)}
				</Modal>
			)}
		</>
	);
}
