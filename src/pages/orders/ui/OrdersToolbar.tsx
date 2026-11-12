import { IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { type Order, statusLabels } from "@/entities/warehouse";
import { Button, StableLabel } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import type { useOrdersPage } from "../model/useOrdersPage";

export interface OrdersToolbarProps {
	columns: ReactNode;
	filters: ReturnType<typeof useOrdersPage>["filters"];
	kind: Order["kind"];
	canCreate: boolean;
	onCreate: () => void;
}

export function OrdersToolbar({
	filters,
	columns,
	kind,
	canCreate,
	onCreate,
}: OrdersToolbarProps) {
	const { search, setSearch } = filters;

	return (
		<>
			<Button
				disabled={!canCreate}
				title={!canCreate ? "Создание недоступно по данным сервера" : undefined}
				variant="default"
				onClick={onCreate}
			>
				<IconPlus size={18} />
				<StableLabel variants={["Поставка", "Заказ"]}>
					{kind === "inbound" ? "Поставка" : "Заказ"}
				</StableLabel>
			</Button>
			{columns}
			<ListFilters
				search={{ value: search, onChange: setSearch }}
				count={
					[filters.status !== "all", filters.category !== "all"].filter(Boolean)
						.length
				}
				onReset={filters.resetFilters}
			>
				<Select
					aria-label="Статус заказа"
					value={filters.status}
					onValueChange={filters.setStatus}
					options={[
						{ value: "all", label: "Все статусы" },
						...filters.statuses.map((s) => ({
							value: s,
							label: statusLabels[s] ?? s,
						})),
					]}
				/>
				<Select
					aria-label="Категория заказа"
					value={filters.category}
					onValueChange={filters.setCategory}
					options={[
						{ value: "all", label: "Все категории" },
						...filters.categories.map((c) => ({ value: c.id, label: c.name })),
					]}
				/>
			</ListFilters>
		</>
	);
}
