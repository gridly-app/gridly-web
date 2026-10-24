import type { Warehouse, WarehouseLiveState } from "@/entities/warehouse";

export interface DemoFixture {
	demoVersion?: number;
	warehouses: Warehouse[];
}
export interface WarehouseStore {
	listWarehouses(): Warehouse[];
	runningWarehouseIds(): string[];
	getWarehouse(id: string): Warehouse | undefined;
	getLive(id: string): WarehouseLiveState | undefined;
	saveWarehouse(warehouse: Warehouse): void;
	saveWarehouses(warehouses: Warehouse[]): void;
}
export function toLiveState(warehouse: Warehouse): WarehouseLiveState {
	return {
		layoutVersion: warehouse.version,
		stateVersion: warehouse.stateVersion || warehouse.tick,
		tick: warehouse.tick,
		robots: warehouse.robots,
		orders: warehouse.orders,
		stock: warehouse.stock,
		events: warehouse.events,
		running: warehouse.running,
		asOf: warehouse.asOf,
	};
}
