import { z } from "zod";
import { enrichDemo } from "@/app/demo/fixtures/enrichDemo";
import type {
	DemoFixture,
	WarehouseStore,
} from "@/app/demo/runtime/warehouseStore";
import { toLiveState } from "@/app/demo/runtime/warehouseStore";
import {
	migrateZones,
	type Warehouse,
	warehouseSchema,
} from "@/entities/warehouse";
import type { KeyValueStorage } from "@/shared/lib";

export interface MockDatabase extends DemoFixture {
	users: { login: string; digest: string }[];
}

export interface MockStore extends WarehouseStore {
	users(): MockDatabase["users"];
	addUser(user: MockDatabase["users"][number]): void;
}

export class LocalMockStore implements MockStore {
	private database: MockDatabase;

	constructor(
		private readonly storage: KeyValueStorage,
		seed: () => DemoFixture,
		private readonly key = "gridly.mock.v1",
	) {
		let database: MockDatabase;

		try {
			const raw: unknown = JSON.parse(storage.getItem(key) || "null");

			const legacyWarehouse = warehouseSchema.loose().extend({
				products: z.array(warehouseSchema.shape.products.element.loose()),
			});
			database = z
				.object({
					warehouses: z.array(legacyWarehouse),
					users: z.array(z.object({ login: z.string(), digest: z.string() })),
					demoVersion: z.number().optional(),
				})
				.parse(raw);
			database.warehouses = database.warehouses.map(migrateZones);
		} catch {
			database = { ...seed(), users: [] };
		}
		if (!database.demoVersion) {
			for (const warehouse of database.warehouses) {
				if (
					warehouse.width === 20 &&
					warehouse.height === 14 &&
					warehouse.products.some((product) => product.sku === "EL-0042")
				) {
					enrichDemo(warehouse);
				}
			}
			const fresh = seed();

			for (const warehouse of fresh.warehouses) {
				if (
					!database.warehouses.some(
						(existing) => existing.name === warehouse.name,
					)
				) {
					database.warehouses.push(warehouse);
				}
			}
			database.demoVersion = 2;
		}
		for (const warehouse of database.warehouses) {
			if (warehouse.demoVersion && warehouse.demoVersion < 4) {
				enrichDemo(warehouse);
			}
		}
		database.demoVersion = 4;
		this.database = structuredClone(database);
		this.storage.setItem(this.key, JSON.stringify(this.database));
	}

	listWarehouses() {
		return structuredClone(this.database.warehouses);
	}

	runningWarehouseIds() {
		return this.database.warehouses.filter((w) => w.running).map((w) => w.id);
	}
	getLive(id: string) {
		const warehouse = this.database.warehouses.find((w) => w.id === id);
		return warehouse ? structuredClone(toLiveState(warehouse)) : undefined;
	}

	getWarehouse(id: string) {
		const warehouse = this.database.warehouses.find((w) => w.id === id);

		return warehouse ? structuredClone(warehouse) : undefined;
	}

	saveWarehouse(warehouse: Warehouse) {
		this.saveWarehouses([warehouse]);
	}

	saveWarehouses(warehouses: Warehouse[]) {
		const next = {
			...this.database,
			warehouses: [...this.database.warehouses],
			users: [...this.database.users],
		};

		for (const warehouse of warehouses) {
			const index = next.warehouses.findIndex(
				(item) => item.id === warehouse.id,
			);

			if (index < 0) {
				next.warehouses.push(structuredClone(warehouse));
			} else {
				next.warehouses[index] = structuredClone(warehouse);
			}
		}
		this.commit(next);
	}

	users() {
		return structuredClone(this.database.users);
	}

	addUser(user: MockDatabase["users"][number]) {
		const next = {
			...this.database,
			warehouses: [...this.database.warehouses],
			users: [...this.database.users],
		};

		next.users.push(structuredClone(user));
		this.commit(next);
	}

	private commit(next: MockDatabase) {
		this.storage.setItem(this.key, JSON.stringify(next));
		this.database = next;
	}
}
