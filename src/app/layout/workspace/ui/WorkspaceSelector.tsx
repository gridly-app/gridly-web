import { IconBuildingWarehouse } from "@tabler/icons-react";
import { Select } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import workspaceSidebarStyles from "./WorkspaceSidebar.module.css";

export interface WorkspaceSelectorProps {
	model: WorkspaceShellModel["sidebar"]["workspace"];
}

export function WorkspaceSelector({ model }: WorkspaceSelectorProps) {
	const { warehouseId, changeWarehouse, list } = model;
	const items = [
		{ value: "new", label: "+ Создать склад" },
		...(list.data ?? []).map((warehouse) => ({
			value: warehouse.id,
			label: warehouse.name,
		})),
	];

	return (
		<>
			<span className={workspaceSidebarStyles.sidebarLabel}>
				РАБОЧЕЕ ПРОСТРАНСТВО
			</span>
			<div className={workspaceSidebarStyles.workspaceDropdown}>
				<Select
					icon={
						<IconBuildingWarehouse
							className={workspaceSidebarStyles.workspaceIcon}
							aria-hidden="true"
						/>
					}
					options={items}
					value={warehouseId}
					onValueChange={changeWarehouse}
					className={workspaceSidebarStyles.workspaceSelectTrigger}
					aria-label="Рабочее пространство — выбор склада"
				/>
			</div>
		</>
	);
}
