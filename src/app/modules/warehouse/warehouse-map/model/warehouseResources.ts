import type { WarehouseView } from "@/domain/warehouse";

export const warehouseResources = [
	"map",
	"robots",
	"catalog",
	"inventory",
	"orders",
] as const;

export type MapWarehouse = WarehouseView<(typeof warehouseResources)[number]>;
