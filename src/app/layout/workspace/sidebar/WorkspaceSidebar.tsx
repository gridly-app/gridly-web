import { NavLink } from "react-router-dom";
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
import type { WorkspaceShellModel } from "../useWorkspaceShell";
import ProfileMenu from "./ProfileMenu";
import { WarehouseNavigation } from "./WarehouseNavigation";
import { WorkspaceSelector } from "./WorkspaceSelector";
import styles from "./WorkspaceSidebar.module.css";

export interface WorkspaceSidebarProps {
	model: WorkspaceShellModel["sidebar"];
}

export function WorkspaceSidebar({ model }: WorkspaceSidebarProps) {
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
					<Link render={<NavLink to="/" />} className={styles.brand}>
						Gridly
					</Link>
					<SidebarTrigger
						aria-label="Переключить меню"
						className={styles.trigger}
					/>
				</div>

				<span className={styles.label}>РАБОЧЕЕ ПРОСТРАНСТВО</span>
				<WorkspaceSelector {...model.workspace} />
				<Separator className={styles.railSeparator} />
			</SidebarHeader>
			<SidebarContent className={styles.content}>
				<span className={styles.label}>ВЫБРАННЫЙ СКЛАД</span>
				<WarehouseNavigation {...model.navigation} />
			</SidebarContent>
			<SidebarFooter className={styles.footer}>
				<ProfileMenu
					{...model.profile}
					logout={() => {
						void model.profile.logout();
					}}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
