import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"allowedActions",
	"asOf",
	"categories",
	"cells",
	"draft",
	"draftRevision",
	"draftRoutes",
	"height",
	"orders",
	"products",
	"robots",
	"routePlans",
	"running",
	"stock",
	"summary",
	"version",
	"width",
] as const satisfies readonly (keyof Warehouse)[];

export type MapWarehouse = Pick<Warehouse, (typeof warehouseFields)[number]>;
