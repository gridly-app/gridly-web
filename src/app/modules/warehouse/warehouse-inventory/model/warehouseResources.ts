import type { WarehouseView } from "@/domain/warehouse";

export const warehouseResources = [
	"inventory",
	"catalog",
	"map",
	"orders",
	"robots",
	"history",
] as const;

export type InventoryWarehouse = WarehouseView<
	(typeof warehouseResources)[number]
>;
