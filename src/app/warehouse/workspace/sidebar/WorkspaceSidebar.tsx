import type { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import type { WarehouseSection } from "@/ports/navigation";
import { warehousePath } from "@/ports/navigation";
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
import { ProfileMenu } from "./ProfileMenu";
import { WorkspaceSelector } from "./WorkspaceSelector";
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
	const immersive = useImmersiveState();
	return (
		<Sidebar
			inert={immersive}
			aria-hidden={immersive || undefined}
			data-immersive={immersive || undefined}
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
					loading={warehouses.isPending}
					changeWarehouse={(id) => {
						if (id) void navigate(warehousePath(mode, id, section));
					}}
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
