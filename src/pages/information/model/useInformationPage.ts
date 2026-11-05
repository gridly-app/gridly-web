import { useNavigate } from "react-router-dom";
import { useWarehouseResources, useWarehouseScope } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";

export function useInformationPage() {
	const { warehouse } = useWarehouseScope();
	const { warehouse: reportWarehouse } = useWarehouseResources(warehouse, [
		"map",
	]);
	const navigate = useNavigate();
	const mode = useWorkspaceMode();

	function openSettings() {
		void navigate(warehousePath(mode, warehouse.id, "settings"));
	}

	return { warehouse: reportWarehouse, openSettings };
}
