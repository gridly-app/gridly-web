import type { WarehouseResourceData, WarehouseView } from "@/domain/warehouse";

export const warehouseResources = ["settings"] as const;

export type SettingsWarehouse = WarehouseView &
	Partial<WarehouseResourceData<(typeof warehouseResources)[number]>>;
