import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const informationRoute = {
	id: "information",
	path: warehousePaths.information,
	access: warehouseAccess,
	resources: ["orders", "catalog", "inventory", "history"],
	load: () =>
		import("./WarehouseInformation").then(({ WarehouseInformation }) => ({
			default: WarehouseInformation,
		})),
} as const;
