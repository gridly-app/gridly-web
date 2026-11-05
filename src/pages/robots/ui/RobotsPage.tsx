import { IconPlus } from "@tabler/icons-react";
import { statusLabels } from "@/entities/warehouse";
import {
	Button,
	DataPanel,
	ListFilters,
	Modal,
	Select,
	useTableColumns,
} from "@/shared/ui";
import { useRobotsPage } from "../model/useRobotsPage";
import { RobotForm } from "./RobotForm";
import { RobotsTable } from "./RobotsTable";

export function RobotsPage() {
	const model = useRobotsPage();
	const columns = useTableColumns("robots", [
		"Специализация",
		"Скорость",
		"Груз",
		"Текущая задача",
		"Статус",
		"Действия",
	]);
	const {
		setEditing,
		empty,
		editingRobot,
		search,
		setSearch,
		pending,
		editing,
		saveRobot,
	} = model;

	return (
		<>
			<DataPanel
				empty={empty}
				toolbar={
					<>
						<Button
							variant="default"
							disabled={!model.canCreate || pending}
							title={
								!model.canCreate
									? "Создание недоступно по данным сервера"
									: undefined
							}
							onClick={() => setEditing("new")}
						>
							<IconPlus size={18} />
							Добавить робота
						</Button>
						{columns.button}
						<ListFilters
							search={{ value: search, onChange: setSearch }}
							count={
								[model.status !== "all", model.role !== "all"].filter(Boolean)
									.length
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
									...model.statuses.map((s) => ({
										value: s,
										label: statusLabels[s] ?? s,
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
					</>
				}
			>
				<RobotsTable model={model} hiddenColumns={columns.hiddenColumns} />
			</DataPanel>
			{editing && (
				<Modal title="Параметры робота" onClose={() => setEditing(null)}>
					<RobotForm
						robot={editingRobot}
						pending={pending}
						onSave={saveRobot}
					/>
				</Modal>
			)}
		</>
	);
}
