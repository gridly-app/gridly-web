import type { Category } from "@/domain/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import type { useCatalogPage } from "../../model/useCatalogPage";

type CatalogFiltersModel = Pick<
	ReturnType<typeof useCatalogPage>,
	| "tab"
	| "search"
	| "setSearch"
	| "status"
	| "setStatus"
	| "category"
	| "setCategory"
>;

const statusOptions = [
	{ value: "all", label: "Все статусы" },
	{ value: "active", label: "Активные" },
	{ value: "archived", label: "Архив" },
];

export function CatalogFilters({
	model,
	categories,
}: {
	model: CatalogFiltersModel;
	categories: Category[];
}) {
	const { tab, search, setSearch, status, setStatus, category, setCategory } =
		model;
	const hasCategoryFilter = tab === "products";
	const activeCount =
		Number(status !== "all") + Number(hasCategoryFilter && category !== "all");
	const categoryOptions = [
		{ value: "all", label: "Все категории" },
		...categories.map(({ id, name }) => ({ value: id, label: name })),
	];
	const searchField = {
		value: search,
		onChange: setSearch,
		"aria-label": "Поиск по каталогу",
	};

	function handleReset() {
		setStatus("all");
		setCategory("all");
	}

	return (
		<ListFilters search={searchField} count={activeCount} onReset={handleReset}>
			<Select
				aria-label="Статус каталога"
				value={status}
				onValueChange={setStatus}
				options={statusOptions}
			/>
			{hasCategoryFilter && (
				<Select
					aria-label="Категория товара"
					value={category}
					onValueChange={setCategory}
					options={categoryOptions}
				/>
			)}
		</ListFilters>
	);
}
