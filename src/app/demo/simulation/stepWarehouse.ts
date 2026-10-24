import {
	commitTaskDelivery,
	completeOrder,
	type Warehouse,
} from "@/entities/warehouse";
import { replenishDemoOrders, startQueuedOrders } from "../services/demoOrders";
import { advanceRobot } from "../services/robotTasks";
import { type SimulationContext, scenarioDate, systemContext } from "./context";
import { applyTaskPlan, createPlanningContext, planTask } from "./taskPlanner";

export function stepWarehouse(
	warehouse: Warehouse,
	context: SimulationContext = systemContext,
) {
	if (!warehouse.running) return;
	const now = context.now();
	const today = scenarioDate(now, warehouse.timezone);
	warehouse.tick = String(BigInt(warehouse.tick) + 1n);
	warehouse.stateVersion = String(BigInt(warehouse.stateVersion || "0") + 1n);
	warehouse.asOf = now.toISOString();
	replenishDemoOrders(warehouse, context, now);
	startQueuedOrders(warehouse, today);
	const planning = createPlanningContext(warehouse, today);
	for (const order of warehouse.orders.filter((o) => o.status === "running")) {
		if (warehouse.robots.some((r) => r.currentTask?.orderId === order.id))
			continue;
		for (const robot of warehouse.robots) {
			const result = planTask(planning, order.id, robot.id);
			if (result.kind === "planned") {
				applyTaskPlan(warehouse, result, context.nextId);
				break;
			}
			if (!robot.currentTask) order.reason = result.reason;
			if (result.kind === "wait") break;
		}
	}
	const occupied = new Set(warehouse.robots.map((r) => `${r.x},${r.y}`));
	for (const robot of warehouse.robots) {
		const task = robot.currentTask;
		if (
			advanceRobot(warehouse, robot, occupied, planning.path) !== "delivered" ||
			!task
		)
			continue;
		commitTaskDelivery(warehouse, task, context.nextId);
		delete robot.currentTask;
		robot.status = "idle";
		const order = warehouse.orders.find((o) => o.id === task.orderId);
		if (!order) continue;
		completeOrder(warehouse, order);
		if (!["received", "shipped"].includes(order.status)) continue;
		warehouse.events.unshift({
			id: context.nextId(),
			time: now.toISOString(),
			title: order.kind === "inbound" ? "Поставка принята" : "Заказ отправлен",
			detail: `${order.number} · ${order.party}`,
		});
	}
	warehouse.events = warehouse.events.slice(0, 200);
}
