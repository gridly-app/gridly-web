import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"allowedActions",
	"categories",
	"orders",
	"policy",
	"products",
	"timezone",
	"running",
	"robots",
	"asOf",
	"lastTickAt",
] as const satisfies readonly (keyof Warehouse)[];

export type OrderScreenWarehouse = Pick<
	Warehouse,
	(typeof warehouseFields)[number]
>;
