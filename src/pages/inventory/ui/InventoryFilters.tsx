import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Select } from "@/shared/ui/forms";
import type { useInventoryPage } from "../model/useInventoryPage";

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
	const writeOffView = model.view === "writeoffs";

	return (
		<ListFilters
			search={{
				"aria-label": searchLabels[model.view],
				value: model.search,
				onChange: model.setSearch,
			}}
			count={
				[
					model.category !== "all",
					!!model.productFilter,
					model.filter !== "all",
					!!model.from,
					!!model.to,
				].filter(Boolean).length
			}
			onReset={model.resetFilters}
		>
			<Select
				aria-label="Товар"
				value={model.productFilter ?? "all"}
				onValueChange={model.setProduct}
				options={[
					{ value: "all", label: "Все товары" },
					...model.warehouse.products.map((product) => ({
						value: product.id,
						label: `${product.name} · ${product.sku}`,
					})),
				]}
			/>
			{model.view !== "incoming" && (
				<Select
					aria-label={writeOffView ? "Фильтр списаний" : "Фильтр остатков"}
					value={model.filter}
					onValueChange={model.changeFilter}
					options={writeOffView ? writeOffOptions : stockOptions}
				/>
			)}
			{writeOffView && (
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
				options={[
					{ value: "all", label: "Все категории" },
					...model.categories.map((category) => ({
						value: category.id,
						label: category.name,
					})),
				]}
			/>
		</ListFilters>
	);
}
