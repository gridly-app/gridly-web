import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Select } from "@/shared/ui/forms";

import type { useHistoryPage } from "../../model/useHistoryPage";

type HistoryFiltersModel = Pick<
	ReturnType<typeof useHistoryPage>,
	| "search"
	| "setSearch"
	| "category"
	| "setCategory"
	| "groups"
	| "sort"
	| "setSort"
	| "from"
	| "setFrom"
	| "to"
	| "setTo"
>;

const sortOptions = [
	{ value: "newest", label: "Сначала новые" },
	{ value: "oldest", label: "Сначала старые" },
];

export function HistoryFilters({ model }: { model: HistoryFiltersModel }) {
	const activeFilters = [
		model.category !== "all",
		model.sort !== "newest",
		Boolean(model.from),
		Boolean(model.to),
	];
	const categoryOptions = [
		{ value: "all", label: "Все разделы" },
		...model.groups,
	];
	const searchField = {
		"aria-label": "Поиск по истории",
		value: model.search,
		onChange: model.setSearch,
	};

	function handleReset() {
		model.setCategory("all");
		model.setSort("newest");
		model.setFrom("");
		model.setTo("");
	}

	return (
		<ListFilters
			search={searchField}
			count={activeFilters.filter(Boolean).length}
			onReset={handleReset}
		>
			<Select
				aria-label="Раздел истории"
				value={model.category}
				onValueChange={model.setCategory}
				options={categoryOptions}
			/>
			<Select
				aria-label="Порядок событий"
				value={model.sort}
				onValueChange={model.setSort}
				options={sortOptions}
			/>
			<DateRangeFields
				from={model.from}
				to={model.to}
				onFromChange={model.setFrom}
				onToChange={model.setTo}
			/>
		</ListFilters>
	);
}
