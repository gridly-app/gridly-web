import { IconPlus } from "@tabler/icons-react";
import { Button, DataPanel, Modal, SearchField } from "@/shared/ui";
import { useRobotsPage } from "../model/useRobotsPage";
import { RobotForm } from "./RobotForm";
import { RobotsTable } from "./RobotsTable";

export function RobotsPage() {
	const model = useRobotsPage();
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
						<SearchField value={search} onChange={setSearch} />
					</>
				}
			>
				<RobotsTable model={model} />
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
