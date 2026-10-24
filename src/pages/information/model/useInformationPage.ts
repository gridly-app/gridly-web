import { useNavigate } from "react-router-dom";
import { useWarehouseScope } from "@/entities/warehouse";

export function useInformationPage() {
	const { warehouse } = useWarehouseScope();
	const navigate = useNavigate();

	function openSettings() {
		void navigate(`/warehouses/${warehouse.id}/settings`);
	}

	return { warehouse, openSettings };
}
