import { IconBuildingWarehouse } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import { useImmersiveState } from "@/shared/lib";
import {
	Link,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarTrigger,
} from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import ProfileMenu from "./profile/ProfileMenu";
import { WarehouseNavigation } from "./WarehouseNavigation";
import { WorkspaceSelector } from "./WorkspaceSelector";
import workspaceSidebarStyles from "./WorkspaceSidebar.module.css";

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
			className={workspaceSidebarStyles.workspace}
		>
			<SidebarHeader>
				<div className={workspaceSidebarStyles.sidebarBrandRow}>
					<Link
						render={<NavLink to="/" />}
						className={workspaceSidebarStyles.brand}
					>
						<div className={workspaceSidebarStyles.brandIcon}>
							<IconBuildingWarehouse size={24} />
						</div>
						Gridly
						<span className={workspaceSidebarStyles["brand-dot"]}>.</span>
					</Link>
					<SidebarTrigger className={workspaceSidebarStyles.trigger} />
				</div>

				<WorkspaceSelector model={model.workspace} />
			</SidebarHeader>
			<SidebarContent>
				<WarehouseNavigation model={model.navigation} />
			</SidebarContent>
			<SidebarFooter className={workspaceSidebarStyles.sidebarBottom}>
				<ProfileMenu
					user={model.profile.user}
					isDemo={model.profile.isDemo}
					dark={model.profile.dark}
					setDark={model.profile.setDark}
					logout={() => {
						void model.profile.logout();
					}}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
