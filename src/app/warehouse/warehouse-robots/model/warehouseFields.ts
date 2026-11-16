import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"allowedActions",
	"cells",
	"published",
	"robots",
	"orders",
	"products",
] as const satisfies readonly (keyof Warehouse)[];

export type RobotsWarehouse = Pick<Warehouse, (typeof warehouseFields)[number]>;
