import { useParams } from "react-router-dom";

import { useWorkspaceMode } from "@/ports/session";
import { ImmersiveProvider } from "@/shared/lib";
import { SidebarProvider } from "@/shared/ui/navigation";

import { WarehouseNavigation } from "./warehouse-navigation";
import { useWarehouseRoute } from "./model/useWarehouseRoute";
import { WorkspaceContent } from "./ui/WorkspaceContent/WorkspaceContent";
import { WorkspaceSidebar } from "./ui/WorkspaceSidebar/WorkspaceSidebar";

import styles from "./Warehouse.module.css";

export function Warehouse() {
	const { warehouseId } = useParams();
	const route = useWarehouseRoute();
	const mode = useWorkspaceMode();
	const section = route?.warehouseSection ?? "map";

	if (!warehouseId) throw new Error("Warehouse route requires a warehouseId");

	const navigation = (
		<WarehouseNavigation
			warehouseId={warehouseId}
			section={section}
			mode={mode}
		/>
	);

	return (
		<ImmersiveProvider>
			<SidebarProvider className={styles.appShell}>
				<WorkspaceSidebar
					warehouseId={warehouseId}
					section={section}
					navigation={navigation}
				/>
				<WorkspaceContent warehouseId={warehouseId} route={route} />
			</SidebarProvider>
		</ImmersiveProvider>
	);
}
