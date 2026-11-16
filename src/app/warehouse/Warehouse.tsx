import { useParams } from "react-router-dom";
import { useWorkspaceMode } from "@/ports/session";
import { ImmersiveProvider } from "@/shared/lib";
import { SidebarProvider } from "@/shared/ui/navigation";
import workspaceStyles from "./Warehouse.module.css";
import { WarehouseNavigation } from "./warehouse-navigation";
import { WorkspaceContent } from "./workspace/content/WorkspaceContent";
import { WorkspaceSidebar } from "./workspace/sidebar/WorkspaceSidebar";
import { useWarehouseRoute } from "./workspace/warehouseSection";

export function Warehouse() {
	const { warehouseId } = useParams();
	const route = useWarehouseRoute();
	const section = route?.warehouseSection ?? "map";
	const mode = useWorkspaceMode();
	if (!warehouseId) throw new Error("Warehouse route requires a warehouseId");

	return (
		<ImmersiveProvider>
			<SidebarProvider className={workspaceStyles.appShell}>
				<WorkspaceSidebar
					warehouseId={warehouseId}
					section={section}
					navigation={
						<WarehouseNavigation
							warehouseId={warehouseId}
							section={section}
							mode={mode}
						/>
					}
				/>
				<WorkspaceContent warehouseId={warehouseId} route={route} />
			</SidebarProvider>
		</ImmersiveProvider>
	);
}
