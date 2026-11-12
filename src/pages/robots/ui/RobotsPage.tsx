import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Modal } from "@/shared/ui/overlays";
import { useRobotsPage } from "../model/useRobotsPage";
import { RobotFilters } from "./RobotFilters";
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
	const { setEditing, empty, editingRobot, pending, editing, saveRobot } =
		model;

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
						<RobotFilters model={model} />
					</>
				}
			>
				<RobotsTable model={model} hiddenColumns={columns.hiddenColumns} />
			</DataPanel>
			{editing && (
				<Modal title="Параметры робота" onClose={() => setEditing(null)}>
					<RobotForm
						robot={editingRobot}
						spawnCells={model.spawnCells}
						pending={pending}
						onSave={saveRobot}
					/>
				</Modal>
			)}
		</>
	);
}
