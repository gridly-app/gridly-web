import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Modal } from "@/shared/ui/overlays";

import { useRobotsPage } from "./model/useRobotsPage";
import { RobotFilters } from "./ui/RobotFilters/RobotFilters";
import { RobotForm } from "./ui/RobotForm/RobotForm";
import { RobotsTable } from "./ui/RobotsTable/RobotsTable";

export function WarehouseRobots() {
	const model = useRobotsPage();
	const columns = useTableColumns("robots", [
		"Специализация",
		"Скорость",
		"Груз",
		"Текущая задача",
		"Статус",
		"Действия",
	]);
	const { setEditing, editing, editingRobot, pending, saveRobot } = model;
	const createHint = model.canCreate
		? undefined
		: "Создание недоступно по данным сервера";

	function handleCreate() {
		setEditing("new");
	}

	function handleCloseEditor() {
		setEditing(null);
	}

	const toolbar = (
		<>
			<Button
				variant="default"
				disabled={!model.canCreate || pending}
				title={createHint}
				onClick={handleCreate}
			>
				<IconPlus size={18} />
				Добавить робота
			</Button>
			{columns.button}
			<RobotFilters model={model} />
		</>
	);

	return (
		<>
			<DataPanel empty={model.isEmpty} toolbar={toolbar}>
				<RobotsTable model={model} hiddenColumns={columns.hiddenColumns} />
			</DataPanel>
			{editing && (
				<Modal title="Параметры робота" onClose={handleCloseEditor}>
					<RobotForm
						robot={editingRobot}
						spawnCells={model.spawnCells}
						isPending={pending}
						onSave={saveRobot}
					/>
				</Modal>
			)}
		</>
	);
}
