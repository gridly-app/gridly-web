import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Select } from "@/shared/ui/forms";
import type { useHistoryPage } from "../model/useHistoryPage";

interface HistoryFiltersProps {
	model: Pick<
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
}

export function HistoryFilters({ model }: HistoryFiltersProps) {
	return (
		<ListFilters
			search={{
				"aria-label": "Поиск по истории",
				value: model.search,
				onChange: model.setSearch,
			}}
			count={
				[
					model.category !== "all",
					model.sort !== "newest",
					!!model.from,
					!!model.to,
				].filter(Boolean).length
			}
			onReset={() => {
				model.setCategory("all");
				model.setSort("newest");
				model.setFrom("");
				model.setTo("");
			}}
		>
			<Select
				aria-label="Раздел истории"
				value={model.category}
				onValueChange={model.setCategory}
				options={[{ value: "all", label: "Все разделы" }, ...model.groups]}
			/>
			<Select
				aria-label="Порядок событий"
				value={model.sort}
				onValueChange={model.setSort}
				options={[
					{ value: "newest", label: "Сначала новые" },
					{ value: "oldest", label: "Сначала старые" },
				]}
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
