import { statusLabels } from "@/entities/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";
import type { useRobotsPage } from "../model/useRobotsPage";

interface RobotFiltersProps {
	model: Pick<
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
}

export function RobotFilters({ model }: RobotFiltersProps) {
	return (
		<ListFilters
			search={{ value: model.search, onChange: model.setSearch }}
			count={
				[model.status !== "all", model.role !== "all"].filter(Boolean).length
			}
			onReset={() => {
				model.setStatus("all");
				model.setRole("all");
			}}
		>
			<Select
				aria-label="Статус робота"
				value={model.status}
				onValueChange={model.setStatus}
				options={[
					{ value: "all", label: "Все статусы" },
					...model.statuses.map((status) => ({
						value: status,
						label: statusLabels[status] ?? status,
					})),
				]}
			/>
			<Select
				aria-label="Специализация робота"
				value={model.role}
				onValueChange={model.setRole}
				options={[
					{ value: "all", label: "Все специализации" },
					...model.roleOptions,
				]}
			/>
		</ListFilters>
	);
}
