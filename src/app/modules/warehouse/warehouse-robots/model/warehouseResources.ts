import type { WarehouseView } from "@/domain/warehouse";

export const warehouseResources = [
	"map",
	"robots",
	"orders",
	"catalog",
] as const;

export type RobotsWarehouse = WarehouseView<
	(typeof warehouseResources)[number]
>;
