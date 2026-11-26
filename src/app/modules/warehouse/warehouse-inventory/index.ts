import { warehouseResources } from "./model/warehouseResources";
import { warehouseAccess, warehousePaths } from "@/ports/navigation";

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
