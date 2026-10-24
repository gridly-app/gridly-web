import type { Order, Robot, Warehouse } from "@/entities/warehouse";
import { scenarioDate, systemContext } from "../simulation/context";
import {
	applyTaskPlan,
	createPlanningContext,
	planTask,
} from "../simulation/taskPlanner";

export function assignRobotTask(
	warehouse: Warehouse,
	order: Order,
	robot: Robot,
): boolean {
	const context = createPlanningContext(
		warehouse,
		scenarioDate(systemContext.now(), warehouse.timezone),
	);
	const plan = planTask(context, order.id, robot.id);
	if (plan.kind !== "planned") {
		order.reason = plan.reason;
		return false;
	}
	return applyTaskPlan(warehouse, plan, systemContext.nextId);
}
