import { ImmersiveProvider } from "@/shared/lib";
import { ConfirmDialog, SidebarProvider } from "@/shared/ui";
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
			<SidebarProvider className={workspaceStyles.appShell}>
				<WorkspaceSidebar model={model.sidebar} />
				<WorkspaceContent model={model.content} />
				<WorkspaceNotification model={model.notice} />
				<WarehouseCreationDialog model={model.creation} />
				{model.isDemo && (
					<ConfirmDialog
						{...model.demoReset}
						title="Начать демо заново?"
						description="Все изменения в текущем демо будут потеряны. Откроется новый готовый склад."
						confirmLabel="Начать заново"
					/>
				)}
			</SidebarProvider>
		</ImmersiveProvider>
	);
}
