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
	const {
		empty,
		noResults,
		tab,
		setTab,
		search,
		setSearch,
		visibleProducts,
		visibleCategories,
		toggleProductArchive,
	} = useCatalogPage(warehouse, command);
	const {
		dialog,
		close,
		openNewItem,
		editProduct,
		editCategory,
		saveProduct,
		saveCategory,
	} = useCatalogDialog(execute);

	return (
		<>
			<DataPanel
				empty={noResults}
				emptyMessage={
					empty
						? "В этом разделе каталога пока нет записей."
						: "Ничего не найдено. Измените поиск."
				}
				toolbar={
					<CatalogToolbar
						tab={tab}
						canCreate={
							!!warehouse.allowedActions?.includes(
								tab === "products" ? "create-product" : "create-category",
							)
						}
						search={search}
						onTabChange={setTab}
						onSearchChange={setSearch}
						onCreate={() => openNewItem(tab)}
					/>
				}
			>
				{tab === "products" ? (
					<ProductsTable
						items={visibleProducts}
						pending={pending}
						onEdit={editProduct}
						onToggleArchive={toggleProductArchive}
					/>
				) : (
					<CategoriesTable items={visibleCategories} onEdit={editCategory} />
				)}
			</DataPanel>
			<CatalogDialog
				dialog={dialog}
				onClose={close}
				pending={pending}
				categories={warehouse.categories}
				onSaveProduct={saveProduct}
				onSaveCategory={saveCategory}
			/>
		</>
	);
}
