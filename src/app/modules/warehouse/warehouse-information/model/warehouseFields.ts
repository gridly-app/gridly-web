import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"name",
	"categories",
	"cells",
	"orders",
	"products",
	"stock",
	"timezone",
	"writeOffs",
	"cabinet",
] as const satisfies readonly (keyof Warehouse)[];

export type ReportWarehouse = Pick<Warehouse, (typeof warehouseFields)[number]>;
