import { IconPlus } from "@tabler/icons-react";
import { statusLabels } from "@/entities/warehouse";
import {
	Button,
	ListFilters,
	SearchField,
	Select,
	StableLabel,
} from "@/shared/ui";

import type { useOrderDialogs } from "../model/useOrderDialogs";
import type { useOrdersPage } from "../model/useOrdersPage";

export interface OrdersToolbarProps {
	model: Pick<
		ReturnType<typeof useOrdersPage>,
		| "resetFilters"
		| "page"
		| "search"
		| "setSearch"
		| "canCreate"
		| "status"
		| "setStatus"
		| "category"
		| "setCategory"
		| "statuses"
		| "categories"
	> &
		Pick<ReturnType<typeof useOrderDialogs>, "openCreation">;
}

export function OrdersToolbar({ model }: OrdersToolbarProps) {
	const { openCreation, page, search, setSearch } = model;

	return (
		<>
			<Button
				disabled={!model.canCreate}
				title={
					!model.canCreate ? "Создание недоступно по данным сервера" : undefined
				}
				variant="default"
				onClick={openCreation}
			>
				<IconPlus size={18} />
				<StableLabel variants={["Новая поставка", "Новый заказ"]}>
					{page === "inbound" ? "Новая поставка" : "Новый заказ"}
				</StableLabel>
			</Button>
			<SearchField value={search} onChange={setSearch} />
			<ListFilters
				count={
					[model.status !== "all", model.category !== "all"].filter(Boolean)
						.length
				}
				onReset={model.resetFilters}
			>
				<Select
					aria-label="Статус заказа"
					value={model.status}
					onValueChange={model.setStatus}
					options={[
						{ value: "all", label: "Все статусы" },
						...model.statuses.map((s) => ({
							value: s,
							label: statusLabels[s] ?? s,
						})),
					]}
				/>
				<Select
					aria-label="Категория заказа"
					value={model.category}
					onValueChange={model.setCategory}
					options={[
						{ value: "all", label: "Все категории" },
						...model.categories.map((c) => ({ value: c.id, label: c.name })),
					]}
				/>
			</ListFilters>
		</>
	);
}
