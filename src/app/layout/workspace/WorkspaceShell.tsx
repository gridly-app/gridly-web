import { useLayoutEffect } from "react";
import { ImmersiveProvider, useTheme } from "@/shared/lib";
import { SidebarProvider } from "@/shared/ui/navigation";
import { WorkspaceContent } from "./content/WorkspaceContent";
import { WarehouseCreationDialog } from "./creation/WarehouseCreationDialog";
import { WorkspaceSidebar } from "./sidebar/WorkspaceSidebar";
import { useWorkspaceShell } from "./useWorkspaceShell";
import workspaceStyles from "./WorkspaceShell.module.css";

export function WorkspaceShell() {
	const model = useWorkspaceShell();
	const { dark } = useTheme();
	useLayoutEffect(() => {
		const root = document.documentElement;
		root.dataset.theme = dark ? "dark" : "light";
		root.classList.toggle("dark", dark);
		return () => {
			root.dataset.theme = "light";
			root.classList.remove("dark");
		};
	}, [dark]);

	return (
		<ImmersiveProvider>
			<SidebarProvider className={workspaceStyles.appShell}>
				<WorkspaceSidebar model={model.sidebar} />
				<WorkspaceContent model={model.content} />
				<WarehouseCreationDialog model={model.creation} />
			</SidebarProvider>
		</ImmersiveProvider>
	);
}
