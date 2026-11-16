import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const inventoryRoute = {
	id: "inventory",
	path: warehousePaths.inventory,
	access: warehouseAccess,
	resources: ["inventory", "catalog", "map", "orders", "robots", "history"],
	load: () =>
		import("./WarehouseInventory").then(({ WarehouseInventory }) => ({
			default: WarehouseInventory,
		})),
} as const;
