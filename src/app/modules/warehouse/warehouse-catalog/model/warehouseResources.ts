import type { WarehouseResourceData, WarehouseView } from "@/domain/warehouse";

export const warehouseResources = ["catalog", "inventory"] as const;

export type CatalogWarehouse = WarehouseView<
	(typeof warehouseResources)[number]
>;

export type CatalogLayoutWarehouse = CatalogWarehouse &
	WarehouseResourceData<"map">;

export type CatalogMovementsWarehouse = CatalogWarehouse &
	WarehouseResourceData<"orders" | "history">;
