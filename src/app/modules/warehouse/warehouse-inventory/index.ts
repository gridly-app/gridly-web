import { warehouseAccess, warehousePaths } from "@/ports/navigation";

import { warehouseResources } from "./model/warehouseResources";

export const inventoryRoute = {
	id: "inventory",
	path: warehousePaths.inventory,
	access: warehouseAccess,
	resources: warehouseResources,
	load: () =>
		import("./WarehouseInventory").then(({ WarehouseInventory }) => ({
			default: WarehouseInventory,
		})),
} as const;
