import { createDemoWarehouses } from "@/app/demo/fixtures/createDemoWarehouses";
import type { DemoFixture } from "@/app/demo/runtime/warehouseStore";
import { toLiveState } from "@/app/demo/runtime/warehouseStore";
import type { Warehouse } from "@/entities/warehouse";
import type { MockStore } from "./MockStore";

export class DemoSessionStore implements MockStore {
	private demo: DemoFixture;

	private demoActive: boolean;

	constructor(
		private readonly persistent: MockStore,
		private readonly createFixture: () => DemoFixture,
		demoActive = false,
	) {
		this.demo = this.freshDemo();
		this.demoActive = demoActive;
	}

	enterDemo() {
		this.demo = this.freshDemo();
		this.demoActive = true;
	}

	enterWorkspace() {
		this.demoActive = false;
	}

	listWarehouses() {
		return this.demoActive
			? structuredClone(this.demo.warehouses)
			: this.persistent.listWarehouses();
	}

	runningWarehouseIds() {
		return this.demoActive
			? this.demo.warehouses.filter((w) => w.running).map((w) => w.id)
			: this.persistent.runningWarehouseIds();
	}
	getLive(id: string) {
		if (!this.demoActive) return this.persistent.getLive(id);
		const warehouse = this.demo.warehouses.find((w) => w.id === id);
		return warehouse ? structuredClone(toLiveState(warehouse)) : undefined;
	}

	getWarehouse(id: string) {
		return this.demoActive
			? structuredClone(
					this.demo.warehouses.find((warehouse) => warehouse.id === id),
				)
			: this.persistent.getWarehouse(id);
	}

	saveWarehouse(warehouse: Warehouse) {
		this.saveWarehouses([warehouse]);
	}

	saveWarehouses(warehouses: Warehouse[]) {
		if (!this.demoActive) {
			this.persistent.saveWarehouses(warehouses);

			return;
		}
		const copies = warehouses.map((w) => structuredClone(w));
		for (const warehouse of copies) {
			const index = this.demo.warehouses.findIndex(
				(item) => item.id === warehouse.id,
			);

			if (index < 0) {
				this.demo.warehouses.push(warehouse);
			} else {
				this.demo.warehouses[index] = warehouse;
			}
		}
	}

	users() {
		return this.persistent.users();
	}

	addUser(user: ReturnType<MockStore["users"]>[number]) {
		this.persistent.addUser(user);
	}

	private freshDemo(): DemoFixture {
		const fixture = this.createFixture();

		return { ...fixture, warehouses: createDemoWarehouses(() => fixture) };
	}
}
