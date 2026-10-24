import { ImmersiveProvider } from "@/shared/lib";
import { SidebarProvider } from "@/shared/ui";
import { useWorkspaceShell } from "../model/useWorkspaceShell";
import { WarehouseCreationDialog } from "./creation/WarehouseCreationDialog";
import { WorkspaceContent } from "./WorkspaceContent";
import { WorkspaceNotification } from "./WorkspaceNotification";
import workspaceStyles from "./WorkspaceShell.module.css";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

export function WorkspaceShell() {
	const model = useWorkspaceShell();

	return (
		<ImmersiveProvider>
			<SidebarProvider className={workspaceStyles["app-shell"]}>
				<WorkspaceSidebar model={model.sidebar} />
				<WorkspaceContent model={model.content} />
				<WorkspaceNotification model={model.notice} />
				<WarehouseCreationDialog model={model.creation} />
			</SidebarProvider>
		</ImmersiveProvider>
	);
}
