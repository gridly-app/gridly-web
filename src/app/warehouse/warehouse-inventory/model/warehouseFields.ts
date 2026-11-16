import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"asOf",
	"categories",
	"cells",
	"lastTickAt",
	"orders",
	"products",
	"robots",
	"running",
	"stock",
	"tick",
	"timezone",
	"writeOffs",
] as const satisfies readonly (keyof Warehouse)[];

export type InventoryWarehouse = Pick<
	Warehouse,
	(typeof warehouseFields)[number]
>;
