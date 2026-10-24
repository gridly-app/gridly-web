import {
	resizeWarehouse,
	startOrder,
	type Warehouse,
} from "@/entities/warehouse";
import {
	type SimulationContext,
	scenarioDate,
	systemContext,
} from "../simulation/context";
import { placeFixtureStock } from "./placeFixtureStock";
import { populateScenario } from "./populateScenario";

export function enrichDemo(
	warehouse: Warehouse,
	context: SimulationContext = systemContext,
): Warehouse {
	if (warehouse.demoVersion === 4) return warehouse;
	const legacyVersion = warehouse.demoVersion || 0;
	warehouse.running = false;
	if (
		!warehouse.draft &&
		((warehouse.width === 20 && warehouse.height === 14) ||
			(legacyVersion === 2 &&
				warehouse.width === 32 &&
				warehouse.height === 22))
	) {
		warehouse.cells = resizeWarehouse(warehouse, 36, 24);
		warehouse.width = 36;
		warehouse.height = 24;
	}
	const active = warehouse.orders.filter((o) =>
		["running", "waiting", "blocked"].includes(o.status),
	);
	for (const robot of warehouse.robots) {
		delete robot.currentTask;
		delete robot.returnRoute;
		robot.status = "idle";
	}
	for (const stock of warehouse.stock) stock.reserved = 0;
	for (const order of active) {
		order.status = "draft";
		delete order.processed;
		delete order.putaways;
		delete order.allocations;
		delete order.deliveredTaskIds;
	}
	if (legacyVersion < 3) populateScenario(warehouse, context);
	placeFixtureStock(warehouse, context.nextId);
	for (const order of active) {
		if (order.status !== "draft") continue;
		try {
			startOrder(
				warehouse,
				order,
				scenarioDate(context.now(), warehouse.timezone),
			);
		} catch (error) {
			order.status = "blocked";
			order.reason = error instanceof Error ? error.message : String(error);
		}
	}
	warehouse.version++;
	warehouse.demoVersion = 4;
	warehouse.stateVersion = String(
		BigInt(warehouse.stateVersion || warehouse.tick) + 1n,
	);
	return warehouse;
}
