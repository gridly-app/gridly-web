import {
	selectInventoryLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";
import { DataPanel, ListFilters, Select } from "@/shared/ui";
import { useCatalogDialog } from "../model/useCatalogDialog";
import { useCatalogPage } from "../model/useCatalogPage";
import { CatalogDialog } from "./CatalogDialog";
import { CatalogToolbar } from "./CatalogToolbar";
import { CategoriesTable } from "./CategoriesTable";
import { ProductsTable } from "./ProductsTable";

export function CatalogPage() {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectInventoryLive);
	const {
		status,
		setStatus,
		category,
		setCategory,
		storage,
		setStorage,
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
					<>
						{" "}
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
						<ListFilters
							count={
								[
									status !== "all",
									storage !== "all",
									tab === "products" && category !== "all",
								].filter(Boolean).length
							}
							onReset={() => {
								setStatus("all");
								setStorage("all");
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
							<Select
								aria-label="Тип хранения"
								value={storage}
								onValueChange={setStorage}
								options={[
									{ value: "all", label: "Любое хранение" },
									{ value: "general", label: "Обычное" },
									{ value: "cold", label: "Холодное" },
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
