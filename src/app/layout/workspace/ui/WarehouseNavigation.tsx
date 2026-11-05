import { IconLayoutDashboard } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import { warehousePath } from "@/shared/config";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { navigation } from "./navigation";
import workspaceSidebarStyles from "./WorkspaceSidebar.module.css";

export interface WarehouseNavigationProps {
	model: WorkspaceShellModel["sidebar"]["navigation"];
}

export function WarehouseNavigation({ model }: WarehouseNavigationProps) {
	const { warehouseId, mode } = model;

	return (
		<>
			<span
				className={`${workspaceSidebarStyles.sidebarLabel} ${workspaceSidebarStyles.warehouseSectionLabel}`}
			>
				ВЫБРАННЫЙ СКЛАД
			</span>
			<nav aria-label="Выбранный склад">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip="Информация о складе"
							render={
								<NavLink to={warehousePath(mode, warehouseId, "information")} />
							}
							aria-label="Информация"
						>
							<IconLayoutDashboard size={20} />
							<span>Информация</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{navigation.map(([key, label, Icon]) => (
						<SidebarMenuItem key={key}>
							<SidebarMenuButton
								tooltip={label}
								render={<NavLink to={warehousePath(mode, warehouseId, key)} />}
								aria-label={label}
							>
								<Icon size={20} />
								<span>{label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</nav>
		</>
	);
}
