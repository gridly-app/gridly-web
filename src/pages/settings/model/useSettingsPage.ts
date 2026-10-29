import { useWarehouseScope } from "@/entities/warehouse";

export function useSettingsPage() {
	return useWarehouseScope();
}
