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
	IconTruckDelivery,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";

import {
	type WarehouseSection,
	type WorkspaceAccess,
	warehousePath,
} from "@/ports/navigation";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/shared/ui/navigation";

import styles from "./WarehouseNavigation.module.css";

const sections = [
	{ section: "information", label: "Информация", Icon: IconLayoutDashboard },
	{ section: "map", label: "Карта склада", Icon: IconLayoutGrid },
	{ section: "robots", label: "Роботы", Icon: IconRobot },
	{ section: "catalog", label: "Каталог", Icon: IconPackage },
	{ section: "inbound", label: "Поставки", Icon: IconArrowDownLeft },
	{ section: "outbound", label: "Отгрузки", Icon: IconArrowUpRight },
	{ section: "deliveries", label: "Доставки", Icon: IconTruckDelivery },
	{ section: "inventory", label: "Остатки", Icon: IconStack2 },
	{ section: "history", label: "История", Icon: IconHistory },
	{ section: "settings", label: "Настройки", Icon: IconSettings },
] as const satisfies ReadonlyArray<{
	section: WarehouseSection;
	label: string;
	Icon: typeof IconLayoutDashboard;
}>;

const selectionSpring = {
	type: "spring",
	stiffness: 420,
	damping: 26,
} as const;
const instantTransition = { duration: 0 };

export function WarehouseNavigation({
	warehouseId,
	section: currentSection,
	mode,
}: {
	warehouseId: string;
	section: WarehouseSection;
	mode: WorkspaceAccess;
}) {
	const { isMobile, state } = useSidebar();
	const shouldReduceMotion = useReducedMotion();
	const isCollapsed = !isMobile && state === "collapsed";
	const selectionTransition = shouldReduceMotion
		? instantTransition
		: selectionSpring;

	return (
		<nav aria-label="Выбранный склад">
			<SidebarMenu className={styles.menu}>
				{sections.map(({ section, label, Icon }) => {
					const isSelected = section === currentSection;
					const link = (
						<Link
							to={warehousePath(mode, warehouseId, section)}
							aria-current={isSelected ? "page" : undefined}
						/>
					);

					return (
						<SidebarMenuItem key={section}>
							<SidebarMenuButton
								className={styles.menuButton}
								tooltip={label}
								render={link}
								aria-label={label}
							>
								{isCollapsed && isSelected && (
									<motion.span
										layoutId="warehouse-nav-selection"
										data-rail-selection=""
										className={styles.railSelection}
										aria-hidden="true"
										transition={selectionTransition}
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
