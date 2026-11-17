import { useWarehouseResources, useWarehouseScreen } from "@/ports/warehouse";
export function useSettingsPage() {
	const scope = useWarehouseScreen(warehouseFields);
	const settings = useWarehouseResources(scope.warehouse, ["settings"]);
	return {
		...scope,
		warehouse: settings.warehouse,
		settingsError: settings.error,
		retrySettings: settings.retry,
		settingsLoading: settings.loading,
	};
}

import { warehouseFields } from "./warehouseFields";
