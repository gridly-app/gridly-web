import { useSearchParams } from "react-router-dom";
import { useLiveWarehouseScope } from "@/entities/warehouse";
import {
	DataPanel,
	useTableColumns,
	useTableColumnVisibility,
} from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";
import { productColumns } from "../model/productColumns";
import { useCatalogDialog } from "../model/useCatalogDialog";
import { useCatalogPage } from "../model/useCatalogPage";
import { CatalogDialog } from "./CatalogDialog";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogToolbar } from "./CatalogToolbar";
import { CategoriesTable } from "./categories/CategoriesTable";
import { CategoryDetail } from "./categories/CategoryDetail";
import { ProductDetail } from "./products/ProductDetail";
import { ProductsTable } from "./products/ProductsTable";

export function CatalogPage() {
	const { warehouse, execute, command, pending } = useLiveWarehouseScope();
	const catalog = useCatalogPage(warehouse, command);
	const {
		empty,
		noResults,
		tab,
		setTab,
		visibleProducts,
		visibleCategories,
		toggleProductArchive,
	} = catalog;
	const {
		dialog,
		close,
		openNewItem,
		editProduct,
		editCategory,
		saveProduct,
		saveCategory,
	} = useCatalogDialog(execute);

	const categoryColumns = useTableColumns("categories", ["Товаров"]);
	const products = useTableColumnVisibility(
		"gridly.catalog.columns",
		productColumns,
		"visible",
	);

	const selectedCategory =
		dialog?.type === "category" ? dialog.item : undefined;
	const [params, setParams] = useSearchParams();
	const productId = params.get("product");
	const product = warehouse.products.find((item) => item.id === productId);
	function closeProduct() {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.delete("product");
				return next;
			},
			{ replace: true },
		);
	}

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
					<>
						<CatalogToolbar
							tab={tab}
							canCreate={
								!!warehouse.allowedActions?.includes(
									tab === "products" ? "create-product" : "create-category",
								)
							}
							onTabChange={setTab}
							onCreate={() => openNewItem(tab)}
						/>
						{tab === "categories" ? categoryColumns.button : products.button}
						<CatalogFilters model={catalog} categories={warehouse.categories} />
					</>
				}
			>
				{tab === "products" ? (
					<ProductsTable
						items={visibleProducts}
						columns={products.visibleColumns}
						pending={pending}
						onEdit={editProduct}
						onToggleArchive={toggleProductArchive}
					/>
				) : (
					<CategoriesTable
						items={visibleCategories}
						onOpen={editCategory}
						hiddenColumns={categoryColumns.hiddenColumns}
					/>
				)}
			</DataPanel>
			{product ? (
				<ProductDetail
					key={product.id}
					product={product}
					warehouse={warehouse}
					pending={pending}
					onClose={closeProduct}
					onSave={async (input) => {
						await execute("product", input);
					}}
				/>
			) : (
				productId && (
					<Modal title="Карточка товара" onClose={closeProduct}>
						<Feedback tone="error">Товар не найден в каталоге склада.</Feedback>
					</Modal>
				)
			)}
			{selectedCategory ? (
				<CategoryDetail
					key={selectedCategory.id}
					category={
						warehouse.categories.find(
							(item) => item.id === selectedCategory.id,
						) ?? selectedCategory
					}
					warehouse={warehouse}
					execute={execute}
					pending={pending}
					onSave={saveCategory}
					onClose={close}
				/>
			) : (
				<CatalogDialog
					dialog={dialog}
					onClose={close}
					pending={pending}
					categories={warehouse.categories}
					onSaveProduct={saveProduct}
					onSaveCategory={saveCategory}
				/>
			)}
		</>
	);
}
