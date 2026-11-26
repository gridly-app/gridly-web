import type { WarehouseView } from "@/domain/warehouse";

export const warehouseResources = [
	"orders",
	"catalog",
	"inventory",
	"history",
	"map",
] as const;

export type ReportWarehouse = WarehouseView<
	(typeof warehouseResources)[number]
>;
