import { IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { type Order, statusLabels } from "@/domain/warehouse";
import { Button, StableLabel } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import type { useOrdersPage } from "../../model/useOrdersPage";

export function OrdersToolbar({
	filters,
	columns,
	kind,
	canCreate,
	onCreate,
}: {
	columns: ReactNode;
	filters: ReturnType<typeof useOrdersPage>["filters"];
	kind: Order["kind"];
	canCreate: boolean;
	onCreate: () => void;
}) {
	const createHint = canCreate
		? undefined
		: "Создание недоступно по данным сервера";
	const activeCount =
		Number(filters.status !== "all") + Number(filters.category !== "all");
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		...filters.statuses.map((status) => ({
			value: status,
			label: statusLabels[status] ?? status,
		})),
	];
	const categoryOptions = [
		{ value: "all", label: "Все категории" },
		...filters.categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];

	return (
		<>
			<Button
				disabled={!canCreate}
				title={createHint}
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
				search={{ value: filters.search, onChange: filters.setSearch }}
				count={activeCount}
				onReset={filters.resetFilters}
			>
				<Select
					aria-label="Статус заказа"
					value={filters.status}
					onValueChange={filters.setStatus}
					options={statusOptions}
				/>
				<Select
					aria-label="Категория заказа"
					value={filters.category}
					onValueChange={filters.setCategory}
					options={categoryOptions}
				/>
			</ListFilters>
		</>
	);
}
