import { useWarehouseResources, useWarehouseScope } from "@/entities/warehouse";
export function useSettingsPage() {
	const scope = useWarehouseScope();
	const settings = useWarehouseResources(scope.warehouse, ["settings"]);
	return {
		...scope,
		warehouse: settings.warehouse,
		settingsError: settings.error,
		retrySettings: settings.retry,
		settingsLoading: settings.loading,
	};
}
