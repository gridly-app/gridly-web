import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const warehouseSettingsRoute = {
	id: "settings",
	path: warehousePaths.settings,
	access: warehouseAccess,
	resources: [],
	load: () =>
		import("./WarehouseSettings").then(({ WarehouseSettings }) => ({
			default: WarehouseSettings,
		})),
} as const;
