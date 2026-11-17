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
import type { WarehouseSection } from "@/ports/navigation";
import { warehousePath } from "@/ports/navigation";
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
	["deliveries", "Доставки", IconTruckDelivery],
	["inventory", "Остатки", IconStack2],
	["history", "История", IconHistory],
	["settings", "Настройки", IconSettings],
] as const satisfies ReadonlyArray<
	readonly [WarehouseSection, string, typeof IconLayoutDashboard]
>;

interface WarehouseNavigationProps {
	warehouseId: string;
	section: WarehouseSection;
	mode: Parameters<typeof warehousePath>[0];
}

export function WarehouseNavigation({
	warehouseId,
	mode,
	section,
}: WarehouseNavigationProps) {
	const { isMobile, state } = useSidebar();
	const reduceMotion = useReducedMotion();
	const collapsed = !isMobile && state === "collapsed";

	return (
		<nav aria-label="Выбранный склад">
			<SidebarMenu className={styles.menu}>
				{navigation.map(([key, label, Icon]) => {
					const path = warehousePath(mode, warehouseId, key);
					const selected = section === key;
					return (
						<SidebarMenuItem key={key}>
							<SidebarMenuButton
								className={styles.menuButton}
								tooltip={label}
								render={
									<Link
										to={path}
										aria-current={selected ? "page" : undefined}
									/>
								}
								aria-label={label}
							>
								{collapsed && selected && (
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
