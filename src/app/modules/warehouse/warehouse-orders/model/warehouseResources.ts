import type { WarehouseView } from "@/domain/warehouse";

export const warehouseResources = ["orders", "catalog", "robots"] as const;

export type OrderScreenWarehouse = WarehouseView<
	(typeof warehouseResources)[number]
>;
