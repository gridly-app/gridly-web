import type { Warehouse } from "@/domain/warehouse";

export const warehouseLocation = (warehouse: Warehouse) =>
	warehouse.location || warehouse.cabinet?.location || "";
