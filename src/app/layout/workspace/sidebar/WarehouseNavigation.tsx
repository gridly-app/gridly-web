import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconHistory,
	IconLayoutDashboard,
	IconLayoutGrid,
	IconPackage,
	IconRobot,
	IconSettings,
	IconStack2,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import { NavLink, useLocation } from "react-router-dom";
import { warehousePath } from "@/shared/config";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/shared/ui/navigation";
import styles from "./WarehouseNavigation.module.css";

const navigation = [
	["information", "Информация", IconLayoutDashboard],
	["map", "Карта склада", IconLayoutGrid],
	["robots", "Роботы", IconRobot],
	["catalog", "Каталог", IconPackage],
	["inbound", "Поставки", IconArrowDownLeft],
	["outbound", "Отгрузки", IconArrowUpRight],
	["inventory", "Остатки", IconStack2],
	["history", "История", IconHistory],
	["settings", "Настройки", IconSettings],
] as const;

export interface WarehouseNavigationProps {
	warehouseId: string;
	mode: Parameters<typeof warehousePath>[0];
}

export function WarehouseNavigation({
	warehouseId,
	mode,
}: WarehouseNavigationProps) {
	const { pathname } = useLocation();
	const { isMobile, state } = useSidebar();
	const reduceMotion = useReducedMotion();
	const collapsed = !isMobile && state === "collapsed";

	return (
		<nav aria-label="Выбранный склад">
			<SidebarMenu className={styles.menu}>
				{navigation.map(([key, label, Icon]) => {
					const path = warehousePath(mode, warehouseId, key);
					return (
						<SidebarMenuItem key={key}>
							<SidebarMenuButton
								className={styles.menuButton}
								tooltip={label}
								render={<NavLink to={path} />}
								aria-label={label}
							>
								{collapsed && pathname === path && (
									<motion.span
										layoutId="warehouse-nav-selection"
										data-rail-selection=""
										className={styles.railSelection}
										aria-hidden="true"
										transition={
											reduceMotion
												? { duration: 0 }
												: { type: "spring", stiffness: 420, damping: 26 }
										}
									/>
								)}
								<Icon className={styles.icon} size={20} />
								<span className={styles.text}>{label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</nav>
	);
}
