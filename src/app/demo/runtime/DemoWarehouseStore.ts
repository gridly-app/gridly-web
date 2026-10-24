import type { Warehouse } from "@/entities/warehouse";
import { createDemoWarehouses } from "../fixtures/createDemoWarehouses";
import type { DemoFixture } from "./warehouseStore";
import { toLiveState, type WarehouseStore } from "./warehouseStore";

export class DemoWarehouseStore implements WarehouseStore {
	private readonly warehouses: Map<string, Warehouse>;

	constructor(createFixture: () => DemoFixture) {
		this.warehouses = new Map(
			createDemoWarehouses(createFixture).map((warehouse) => [
				warehouse.id,
				warehouse,
			]),
		);
	}

	listWarehouses() {
		return structuredClone([...this.warehouses.values()]);
	}

	runningWarehouseIds() {
		return [...this.warehouses.values()]
			.filter((w) => w.running)
			.map((w) => w.id);
	}
	getLive(id: string) {
		const warehouse = this.warehouses.get(id);
		return warehouse ? structuredClone(toLiveState(warehouse)) : undefined;
	}

	getWarehouse(id: string) {
		return structuredClone(this.warehouses.get(id));
	}

	saveWarehouse(warehouse: Warehouse) {
		this.saveWarehouses([warehouse]);
	}

	saveWarehouses(warehouses: Warehouse[]) {
		const copies = warehouses.map((warehouse) => structuredClone(warehouse));
		for (const warehouse of copies)
			this.warehouses.set(warehouse.id, warehouse);
	}
}
