import { IconColumns } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	selectInventoryLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";
import { readPreference, writePreference } from "@/shared/lib/browserStorage";
import {
	Button,
	DataPanel,
	Feedback,
	ListFilters,
	Menu,
	MenuCheckboxItem,
	MenuPopup,
	MenuTrigger,
	Modal,
	Select,
	useTableColumns,
} from "@/shared/ui";
import { type ProductColumn, productColumns } from "../model/productColumns";
import { useCatalogDialog } from "../model/useCatalogDialog";
import { useCatalogPage } from "../model/useCatalogPage";
import { CatalogDialog } from "./CatalogDialog";
import { CatalogToolbar } from "./CatalogToolbar";
import { CategoriesTable } from "./CategoriesTable";
import { CategoryDetail } from "./CategoryDetail";
import { ProductDetail } from "./ProductDetail";
import { ProductsTable } from "./ProductsTable";

const columnPreference = "gridly.catalog.columns";

export function CatalogPage() {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectInventoryLive);
	const {
		status,
		setStatus,
		category,
		setCategory,
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

	const categoryColumns = useTableColumns("categories", ["Товаров"]);
	const [columns, setColumns] = useState<ProductColumn[]>(() => {
		const stored = readPreference(
			columnPreference,
			"sku,category,volume,occupancy,quantity,price,shelf",
		).split(",");
		return productColumns
			.filter((column) => stored.includes(column.key))
			.map((column) => column.key);
	});
	function setColumn(key: ProductColumn, checked: boolean) {
		const next = checked
			? [...columns, key]
			: columns.filter((column) => column !== key);
		writePreference(columnPreference, next.join(","));
		setColumns(next);
	}

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
						{" "}
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
						{tab === "categories" ? (
							categoryColumns.button
						) : (
							<Menu>
								<MenuTrigger render={<Button variant="secondary" size="sm" />}>
									<IconColumns size={16} /> Столбцы
								</MenuTrigger>
								<MenuPopup align="end">
									{productColumns.map((column) => (
										<MenuCheckboxItem
											key={column.key}
											checked={columns.includes(column.key)}
											closeOnClick={false}
											onCheckedChange={(checked) =>
												setColumn(column.key, checked)
											}
										>
											{column.label}
										</MenuCheckboxItem>
									))}
								</MenuPopup>
							</Menu>
						)}
						<ListFilters
							search={{
								value: search,
								onChange: setSearch,
								"aria-label": "Поиск по каталогу",
							}}
							count={
								[
									status !== "all",
									tab === "products" && category !== "all",
								].filter(Boolean).length
							}
							onReset={() => {
								setStatus("all");
								setCategory("all");
							}}
						>
							<Select
								aria-label="Статус каталога"
								value={status}
								onValueChange={setStatus}
								options={[
									{ value: "all", label: "Все статусы" },
									{ value: "active", label: "Активные" },
									{ value: "archived", label: "Архив" },
								]}
							/>
							{tab === "products" && (
								<Select
									aria-label="Категория товара"
									value={category}
									onValueChange={setCategory}
									options={[
										{ value: "all", label: "Все категории" },
										...warehouse.categories.map((c) => ({
											value: c.id,
											label: c.name,
										})),
									]}
								/>
							)}
						</ListFilters>
					</>
				}
			>
				{tab === "products" ? (
					<ProductsTable
						items={visibleProducts}
						columns={columns}
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
