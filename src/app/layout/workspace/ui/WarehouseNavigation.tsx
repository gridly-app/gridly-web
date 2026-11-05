import { IconLayoutDashboard } from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import { NavLink, useLocation } from "react-router-dom";
import { warehousePath } from "@/shared/config";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { navigation } from "./navigation";
import workspaceSidebarStyles from "./WorkspaceSidebar.module.css";

export interface WarehouseNavigationProps {
	model: WorkspaceShellModel["sidebar"]["navigation"];
}

export function WarehouseNavigation({ model }: WarehouseNavigationProps) {
	const { warehouseId, mode } = model;

	const { pathname } = useLocation();
	const { isMobile, state } = useSidebar();
	const reduceMotion = useReducedMotion();
	const collapsed = !isMobile && state === "collapsed";
	const items = [
		["information", "Информация", IconLayoutDashboard] as const,
		...navigation,
	];

	return (
		<>
			<span
				className={`${workspaceSidebarStyles.sidebarLabel} ${workspaceSidebarStyles.warehouseSectionLabel}`}
			>
				ВЫБРАННЫЙ СКЛАД
			</span>
			<nav aria-label="Выбранный склад">
				<SidebarMenu>
					{items.map(([key, label, Icon]) => {
						const path = warehousePath(mode, warehouseId, key);
						return (
							<SidebarMenuItem key={key}>
								<SidebarMenuButton
									tooltip={label}
									render={<NavLink to={path} />}
									aria-label={label}
								>
									{collapsed && pathname === path && (
										<motion.span
											layoutId="warehouse-nav-selection"
											data-rail-selection=""
											className={workspaceSidebarStyles.railSelection}
											aria-hidden="true"
											transition={
												reduceMotion
													? { duration: 0 }
													: { type: "spring", stiffness: 420, damping: 26 }
											}
										/>
									)}
									<Icon size={20} />
									<span>{label}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</nav>
		</>
	);
}
