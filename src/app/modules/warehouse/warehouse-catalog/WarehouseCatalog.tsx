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
	const { warehouse, execute, command, pending } =
		useWarehouseScreen(warehouseResources);
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
	const [params] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const productId = params.get("product");
	const product = warehouse.products.find((item) => item.id === productId);
	const isProductMissing = !!productId && !product;
	const createAction =
		tab === "products" ? "create-product" : "create-category";
	const canCreate = !!warehouse.allowedActions?.includes(createAction);
	const emptyMessage = empty
		? "В этом разделе каталога пока нет записей."
		: "Ничего не найдено. Измените поиск.";
	const currentCategory =
		selectedCategory &&
		(warehouse.categories.find((item) => item.id === selectedCategory.id) ??
			selectedCategory);

	function closeProduct() {
		updateSearchParams({ product: null });
	}

	function handleCreate() {
		openNewItem(tab);
	}

	async function handleSaveProduct(input: ProductInput) {
		await execute("product", input);
	}

	return (
		<>
			<DataPanel
				empty={noResults}
				emptyMessage={emptyMessage}
				toolbar={
					<>
						<CatalogToolbar
							tab={tab}
							canCreate={canCreate}
							onTabChange={setTab}
							onCreate={handleCreate}
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
			{product && (
				<ProductDetail
					key={product.id}
					product={product}
					warehouse={warehouse}
					pending={pending}
					onClose={closeProduct}
					onSave={handleSaveProduct}
				/>
			)}
			{isProductMissing && (
				<Modal title="Карточка товара" onClose={closeProduct}>
					<Feedback tone="error">Товар не найден в каталоге склада.</Feedback>
				</Modal>
			)}
			{currentCategory ? (
				<CategoryDetail
					key={currentCategory.id}
					category={currentCategory}
					warehouse={warehouse}
					execute={execute}
					isPending={pending}
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
