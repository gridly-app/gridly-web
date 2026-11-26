import { useWarehouseResources, useWarehouseScreen } from "@/ports/warehouse";

import { warehouseResources } from "./warehouseResources";

export function useSettingsPage() {
	const scope = useWarehouseScreen([]);
	const settings = useWarehouseResources(scope.warehouse, warehouseResources);

	return {
		...scope,
		warehouse: settings.data ?? scope.warehouse,
		settingsError: settings.error,
		retrySettings: settings.retry,
		settingsLoading: settings.loading,
	};
}
