import { useWarehouseScope } from "@/entities/warehouse";
import { DataPanel } from "@/shared/ui";
import { useCatalogDialog } from "../model/useCatalogDialog";
import { useCatalogPage } from "../model/useCatalogPage";
import { CatalogDialog } from "./CatalogDialog";
import { CatalogToolbar } from "./CatalogToolbar";
import { CategoriesTable } from "./CategoriesTable";
import { ProductsTable } from "./ProductsTable";

export function CatalogPage() {
	const { warehouse, execute, command, pending } = useWarehouseScope();
	const model = useCatalogPage(warehouse, command);
	const dialog = useCatalogDialog(execute);

	return (
		<>
			<DataPanel
				empty={model.empty}
				toolbar={
					<CatalogToolbar
						model={{
							...model,
							openNewItem: () => dialog.openNewItem(model.tab),
						}}
					/>
				}
			>
				{model.tab === "products" ? (
					<ProductsTable
						model={{ ...model, pending, editProduct: dialog.editProduct }}
					/>
				) : (
					<CategoriesTable
						model={{ ...model, editCategory: dialog.editCategory }}
					/>
				)}
			</DataPanel>
			<CatalogDialog
				model={{ ...dialog, pending, categories: warehouse.categories }}
			/>
		</>
	);
}
