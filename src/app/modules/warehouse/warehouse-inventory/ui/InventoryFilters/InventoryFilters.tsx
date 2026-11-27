import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Select } from "@/shared/ui/forms";

import type { useInventoryPage } from "../../model/useInventoryPage";

type InventoryFiltersModel = Pick<
	ReturnType<typeof useInventoryPage>,
	| "view"
	| "warehouse"
	| "search"
	| "setSearch"
	| "category"
	| "setCategory"
	| "categories"
	| "productFilter"
	| "setProduct"
	| "filter"
	| "changeFilter"
	| "from"
	| "setFrom"
	| "to"
	| "setTo"
	| "resetFilters"
>;

const searchLabels = {
	stock: "Поиск по остаткам",
	incoming: "Поиск по ожидаемым поступлениям",
	writeoffs: "Поиск по списаниям",
};
const unpricedOption = { value: "unpriced", label: "Без цены" };
const stockOptions = [
	{ value: "all", label: "Все партии" },
	{ value: "expired", label: "Просрочено" },
	{ value: "reserved", label: "В резерве" },
	{ value: "zero", label: "Нулевые остатки" },
	unpricedOption,
];
const writeOffOptions = [
	{ value: "all", label: "Все списания" },
	unpricedOption,
];

export function InventoryFilters({ model }: { model: InventoryFiltersModel }) {
	const isWriteOffView = model.view === "writeoffs";
	const activeFilters = [
		model.category !== "all",
		Boolean(model.productFilter),
		model.filter !== "all",
		Boolean(model.from),
		Boolean(model.to),
	];
	const productOptions = [
		{ value: "all", label: "Все товары" },
		...model.warehouse.products.map((product) => ({
			value: product.id,
			label: `${product.name} · ${product.sku}`,
		})),
	];
	const categoryOptions = [
		{ value: "all", label: "Все категории" },
		...model.categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];
	const searchField = {
		"aria-label": searchLabels[model.view],
		value: model.search,
		onChange: model.setSearch,
	};

	return (
		<ListFilters
			search={searchField}
			count={activeFilters.filter(Boolean).length}
			onReset={model.resetFilters}
		>
			<Select
				aria-label="Товар"
				value={model.productFilter ?? "all"}
				onValueChange={model.setProduct}
				options={productOptions}
			/>
			{model.view !== "incoming" && (
				<Select
					aria-label={isWriteOffView ? "Фильтр списаний" : "Фильтр остатков"}
					value={model.filter}
					onValueChange={model.changeFilter}
					options={isWriteOffView ? writeOffOptions : stockOptions}
				/>
			)}
			{isWriteOffView && (
				<DateRangeFields
					from={model.from}
					to={model.to}
					onFromChange={model.setFrom}
					onToChange={model.setTo}
				/>
			)}
			<Select
				aria-label="Категория остатков"
				value={model.category}
				onValueChange={model.setCategory}
				options={categoryOptions}
			/>
		</ListFilters>
	);
}
