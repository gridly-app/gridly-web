import { useSearchParams } from "react-router-dom";

import type { ProductInput } from "@/domain/warehouse";
import { useWarehouseScreen } from "@/ports/warehouse";
import { useUpdateSearchParams } from "@/shared/lib";
import {
	DataPanel,
	useTableColumns,
	useTableColumnVisibility,
} from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";

import { productColumns } from "./model/productColumns";
import { useCatalogDialog } from "./model/useCatalogDialog";
import { useCatalogPage } from "./model/useCatalogPage";
import { warehouseResources } from "./model/warehouseResources";
import { CatalogDialog } from "./ui/CatalogDialog/CatalogDialog";
import { CatalogFilters } from "./ui/CatalogFilters/CatalogFilters";
import { CatalogToolbar } from "./ui/CatalogToolbar/CatalogToolbar";
import { CategoriesTable } from "./ui/CategoriesTable/CategoriesTable";
import { CategoryDetail } from "./ui/CategoryDetail/CategoryDetail";
import { ProductDetail } from "./ui/ProductDetail/ProductDetail";
import { ProductsTable } from "./ui/ProductsTable/ProductsTable";

export function WarehouseCatalog() {
	const {
		warehouse,
		execute,
		command,
		pending: isPending,
	} = useWarehouseScreen(warehouseResources);
	const catalog = useCatalogPage(warehouse, command);
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
	const [params] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const { tab } = catalog;
	const isProductsTab = tab === "products";
	const productId = params.get("product");
	const product = warehouse.products.find((item) => item.id === productId);
	const isProductMissing = Boolean(productId) && !product;
	const createAction = isProductsTab ? "create-product" : "create-category";
	const canCreate = Boolean(warehouse.allowedActions?.includes(createAction));
	const emptyMessage = catalog.isEmpty
		? "В этом разделе каталога пока нет записей."
		: "Ничего не найдено. Измените поиск.";
	const selectedCategory =
		dialog?.type === "category" ? dialog.item : undefined;
	const currentCategory =
		selectedCategory &&
		(warehouse.categories.find((item) => item.id === selectedCategory.id) ??
			selectedCategory);

	function handleCloseProduct() {
		updateSearchParams({ product: null });
	}

	function handleCreate() {
		openNewItem(tab);
	}

	async function handleSaveProduct(input: ProductInput) {
		await execute("product", input);
	}

	const toolbar = (
		<>
			<CatalogToolbar
				tab={tab}
				canCreate={canCreate}
				onTabChange={catalog.setTab}
				onCreate={handleCreate}
			/>
			{isProductsTab ? products.button : categoryColumns.button}
			<CatalogFilters model={catalog} categories={warehouse.categories} />
		</>
	);

	return (
		<>
			<DataPanel
				empty={catalog.hasNoResults}
				emptyMessage={emptyMessage}
				toolbar={toolbar}
			>
				{isProductsTab ? (
					<ProductsTable
						items={catalog.visibleProducts}
						columns={products.visibleColumns}
						isPending={isPending}
						onEdit={editProduct}
						onToggleArchive={catalog.toggleProductArchive}
					/>
				) : (
					<CategoriesTable
						items={catalog.visibleCategories}
						hiddenColumns={categoryColumns.hiddenColumns}
						onOpen={editCategory}
					/>
				)}
			</DataPanel>
			{product && (
				<ProductDetail
					key={product.id}
					product={product}
					warehouse={warehouse}
					isPending={isPending}
					onSave={handleSaveProduct}
					onClose={handleCloseProduct}
				/>
			)}
			{isProductMissing && (
				<Modal title="Карточка товара" onClose={handleCloseProduct}>
					<Feedback tone="error">Товар не найден в каталоге склада.</Feedback>
				</Modal>
			)}
			{currentCategory ? (
				<CategoryDetail
					key={currentCategory.id}
					category={currentCategory}
					warehouse={warehouse}
					execute={execute}
					isPending={isPending}
					onSave={saveCategory}
					onClose={close}
				/>
			) : (
				<CatalogDialog
					dialog={dialog}
					categories={warehouse.categories}
					isPending={isPending}
					onClose={close}
					onSaveProduct={saveProduct}
					onSaveCategory={saveCategory}
				/>
			)}
		</>
	);
}
