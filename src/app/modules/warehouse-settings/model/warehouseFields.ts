import type { Warehouse } from "@/domain/warehouse";

export const warehouseFields = [
	"id",
	"name",
	"policy",
	"policyRevision",
	"revision",
	"settings",
	"cabinet",
	"allowedActions",
	"width",
	"height",
	"draftRevision",
	"timezone",
] as const satisfies readonly (keyof Warehouse)[];

export type SettingsWarehouse = Pick<
	Warehouse,
	(typeof warehouseFields)[number]
>;
