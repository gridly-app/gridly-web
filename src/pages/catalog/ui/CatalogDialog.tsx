import type {
	Category,
	CategoryInput,
	ProductInput,
} from "@/entities/warehouse";
import { Modal } from "@/shared/ui";
import type { CatalogDialogState } from "../model/catalog";
import { CategoryForm } from "./CategoryForm";
import { ProductForm } from "./ProductForm";

export interface CatalogDialogProps {
	dialog: CatalogDialogState | null;
	pending: boolean;
	categories: Category[];
	onClose: () => void;
	onSaveProduct: (product: ProductInput) => Promise<void>;
	onSaveCategory: (category: CategoryInput) => Promise<void>;
}

export function CatalogDialog({
	dialog,
	pending,
	categories,
	onClose,
	onSaveProduct,
	onSaveCategory,
}: CatalogDialogProps) {
	return (
		<>
			{dialog && (
				<Modal
					title={dialog.type === "product" ? "Товар каталога" : "Категория"}
					onClose={onClose}
				>
					{dialog.type === "product" ? (
						<ProductForm
							product={dialog.item}
							categories={categories}
							pending={pending}
							onSave={onSaveProduct}
						/>
					) : (
						<CategoryForm
							category={dialog.item}
							pending={pending}
							onSave={onSaveCategory}
						/>
					)}
				</Modal>
			)}
		</>
	);
}
