import { IconBuildingWarehouse } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { navigation } from "./navigation";
import workspaceSidebarStyles from "./WorkspaceSidebar.module.css";

export interface WarehouseNavigationProps {
	model: WorkspaceShellModel["sidebar"]["navigation"];
}

export function WarehouseNavigation({ model }: WarehouseNavigationProps) {
	const { warehouseId, robotCount, hasWaitingInbound } = model;

	return (
		<>
			<span
				className={`${workspaceSidebarStyles["sidebar-label"]} ${workspaceSidebarStyles["warehouse-section-label"]}`}
			>
				ВЫБРАННЫЙ СКЛАД
			</span>
			<nav aria-label="Выбранный склад">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip="Информация о складе"
							render={<NavLink to={`/warehouses/${warehouseId}/information`} />}
							aria-label="Информация"
						>
							<IconBuildingWarehouse size={20} />
							<span>Информация</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{navigation.map(([key, label, Icon]) => (
						<SidebarMenuItem key={key}>
							<SidebarMenuButton
								tooltip={label}
								render={<NavLink to={`/warehouses/${warehouseId}/${key}`} />}
								aria-label={label}
							>
								<Icon size={20} />
								<span>{label}</span>
								{key === "robots" && robotCount !== undefined && (
									<small>{robotCount}</small>
								)}
								{key === "inbound" && hasWaitingInbound && (
									<i className={workspaceSidebarStyles["notification-dot"]} />
								)}
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</nav>
		</>
	);
}
