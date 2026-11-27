import type { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { type WarehouseSection, warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouses } from "@/ports/warehouse";
import { useImmersiveState } from "@/shared/lib";
import { Separator } from "@/shared/ui/dataDisplay";
import {
	Link,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarTrigger,
} from "@/shared/ui/navigation";

import { ProfileMenu } from "../ProfileMenu/ProfileMenu";
import { WorkspaceSelector } from "../WorkspaceSelector/WorkspaceSelector";

import styles from "./WorkspaceSidebar.module.css";

export function WorkspaceSidebar({
	warehouseId,
	section,
	navigation,
}: {
	warehouseId: string;
	section: WarehouseSection;
	navigation: ReactNode;
}) {
	const mode = useWorkspaceMode();
	const navigate = useNavigate();
	const warehouses = useWarehouses();
	const isImmersive = useImmersiveState();

	function handleWarehouseChange(nextWarehouseId: string) {
		if (nextWarehouseId)
			void navigate(warehousePath(mode, nextWarehouseId, section));
	}

	return (
		<Sidebar
			inert={isImmersive}
			aria-hidden={isImmersive || undefined}
			data-immersive={isImmersive || undefined}
			className={styles.workspace}
		>
			<SidebarHeader className={styles.header}>
				<div className={styles.brandRow}>
					<Link render={<RouterLink to="/" />} className={styles.brand}>
						Gridly
					</Link>
					<SidebarTrigger
						aria-label="Переключить меню"
						className={styles.trigger}
					/>
				</div>
				<span className={styles.label}>РАБОЧЕЕ ПРОСТРАНСТВО</span>
				<WorkspaceSelector
					warehouseId={warehouseId}
					warehouses={warehouses.data ?? []}
					isLoading={warehouses.isPending}
					onWarehouseChange={handleWarehouseChange}
				/>
				<Separator className={styles.railSeparator} />
			</SidebarHeader>
			<SidebarContent className={styles.content}>
				<span className={styles.label}>ВЫБРАННЫЙ СКЛАД</span>
				{navigation}
			</SidebarContent>
			<SidebarFooter className={styles.footer}>
				<ProfileMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
