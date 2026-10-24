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
			<span className={workspaceSidebarStyles["sidebar-label"]}>
				РАБОЧЕЕ ПРОСТРАНСТВО
			</span>
			<div className={workspaceSidebarStyles["workspace-dropdown"]}>
				<IconBuildingWarehouse size={19} aria-hidden="true" />
				<Select
					options={items}
					value={warehouseId}
					onValueChange={changeWarehouse}
					className={workspaceSidebarStyles["workspace-select-trigger"]}
					aria-label="Рабочее пространство — выбор склада"
				/>
			</div>
		</>
	);
}
