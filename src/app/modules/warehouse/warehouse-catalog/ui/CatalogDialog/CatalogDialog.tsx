import type { Category, CategoryInput, ProductInput } from "@/domain/warehouse";
import { Modal } from "@/shared/ui/overlays";

import type { CatalogDialogState } from "../../model/catalog";
import { CategoryForm } from "../CategoryForm/CategoryForm";
import { ProductForm } from "../ProductForm/ProductForm";

export function CatalogDialog({
	dialog,
	categories,
	isPending,
	onClose,
	onSaveProduct,
	onSaveCategory,
}: {
	dialog: CatalogDialogState | null;
	categories: Category[];
	isPending: boolean;
	onClose: () => void;
	onSaveProduct: (product: ProductInput) => Promise<void>;
	onSaveCategory: (category: CategoryInput) => Promise<void>;
}) {
	if (!dialog) return null;

	if (dialog.type === "product") {
		return (
			<Modal title="Товар каталога" onClose={onClose}>
				<ProductForm
					product={dialog.item}
					categories={categories}
					isPending={isPending}
					onSave={onSaveProduct}
				/>
			</Modal>
		);
	}

	return (
		<Modal title="Категория" onClose={onClose}>
			<CategoryForm
				category={dialog.item}
				isPending={isPending}
				onSave={onSaveCategory}
			/>
		</Modal>
	);
}
