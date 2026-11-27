import { statusLabels } from "@/domain/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import type { useRobotsPage } from "../../model/useRobotsPage";

type RobotFiltersModel = Pick<
	ReturnType<typeof useRobotsPage>,
	| "search"
	| "setSearch"
	| "status"
	| "setStatus"
	| "statuses"
	| "role"
	| "setRole"
	| "roleOptions"
>;

export function RobotFilters({ model }: { model: RobotFiltersModel }) {
	const activeCount =
		Number(model.status !== "all") + Number(model.role !== "all");
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		...model.statuses.map((status) => ({
			value: status,
			label: statusLabels[status] ?? status,
		})),
	];
	const roleOptions = [
		{ value: "all", label: "Все специализации" },
		...model.roleOptions,
	];

	function handleReset() {
		model.setStatus("all");
		model.setRole("all");
	}

	return (
		<ListFilters
			search={{ value: model.search, onChange: model.setSearch }}
			count={activeCount}
			onReset={handleReset}
		>
			<Select
				aria-label="Статус робота"
				value={model.status}
				onValueChange={model.setStatus}
				options={statusOptions}
			/>
			<Select
				aria-label="Специализация робота"
				value={model.role}
				onValueChange={model.setRole}
				options={roleOptions}
			/>
		</ListFilters>
	);
}
