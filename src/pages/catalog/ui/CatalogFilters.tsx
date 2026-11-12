import type { Category } from "@/entities/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";
import type { useCatalogPage } from "../model/useCatalogPage";

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
	const showCategory = tab === "products";

	return (
		<ListFilters
			search={{
				value: search,
				onChange: setSearch,
				"aria-label": "Поиск по каталогу",
			}}
			count={
				Number(status !== "all") + Number(showCategory && category !== "all")
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
				options={statusOptions}
			/>
			{showCategory && (
				<Select
					aria-label="Категория товара"
					value={category}
					onValueChange={setCategory}
					options={[
						{ value: "all", label: "Все категории" },
						...categories.map(({ id, name }) => ({ value: id, label: name })),
					]}
				/>
			)}
		</ListFilters>
	);
}
