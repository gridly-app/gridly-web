import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"allowedActions",
	"categories",
	"cells",
	"draft",
	"draftRevision",
	"routePlans",
	"draftRoutes",
	"version",
	"name",
	"orders",
	"products",
	"stock",
	"timezone",
	"writeOffs",
] as const satisfies readonly (keyof Warehouse)[];

export type CatalogWarehouse = Pick<
	Warehouse,
	(typeof warehouseFields)[number]
>;
