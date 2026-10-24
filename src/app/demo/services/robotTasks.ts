import {
	cellKey,
	createWarehousePathfinder,
	type GridPosition,
	type Robot,
	type Warehouse,
} from "@/entities/warehouse";
import { yieldToRobot } from "./yieldToRobot";

type Pathfinder = ReturnType<typeof createWarehousePathfinder>;

function advanceAlongRoute(
	warehouse: Warehouse,
	robot: Robot,
	goal: GridPosition,
	path: GridPosition[],
	occupied: Set<string>,
	pathfinder: Pathfinder,
): GridPosition[] | null {
	for (let step = 0; step < Math.max(1, Math.floor(robot.speed)); step++) {
		let next = path[1];

		if (next && occupied.has(cellKey(next))) {
			const blocked = new Set(occupied);

			blocked.delete(cellKey(robot));
			const route = pathfinder([robot], [goal], blocked);

			if (route.length) {
				path = route;
				next = route[1];
			}
		}
		if (
			next &&
			occupied.has(cellKey(next)) &&
			yieldToRobot(warehouse, robot, next, occupied, pathfinder)
		) {
			return null;
		}
		if (!next || occupied.has(cellKey(next))) {
			break;
		}
		occupied.delete(cellKey(robot));
		robot.x = next.x;
		robot.y = next.y;
		occupied.add(cellKey(robot));
		path.splice(0, 1);
	}
	return path;
}

export function advanceRobot(
	warehouse: Warehouse,
	robot: Robot,
	occupied: Set<string>,
	pathfinder: Pathfinder = createWarehousePathfinder(warehouse.cells),
): "delivered" | "moving" | "idle" {
	const task = robot.currentTask;

	if (!task) {
		const reserved = new Set(
			warehouse.robots.flatMap((other) => {
				const destination = other.returnRoute?.at(-1);
				return destination ? [cellKey(destination)] : [];
			}),
		);

		if (!robot.returnRoute) {
			const targets = warehouse.cells.filter(
				(cell) =>
					(cell.type === "charge" ||
						(cell.type === "aisle" && cell.y === warehouse.height - 2)) &&
					!reserved.has(cellKey(cell)) &&
					(!occupied.has(cellKey(cell)) || cellKey(cell) === cellKey(robot)),
			);
			const blocked = new Set(occupied);

			blocked.delete(cellKey(robot));
			robot.returnRoute = pathfinder([robot], targets, blocked);
		}
		const blockingTask = warehouse.robots.some(
			(other) =>
				other.id !== robot.id &&
				other.currentTask &&
				(cellKey(other.currentTask.target) === cellKey(robot) ||
					other.currentTask.route
						.slice(1, 3)
						.some((point) => cellKey(point) === cellKey(robot))),
		);

		if (blockingTask) {
			const targets = warehouse.cells.filter(
				(cell) =>
					cell.type === "aisle" &&
					Math.abs(cell.x - robot.x) + Math.abs(cell.y - robot.y) === 1 &&
					!occupied.has(cellKey(cell)) &&
					!warehouse.robots.some((other) =>
						other.currentTask?.route
							.slice(1, 3)
							.some((point) => cellKey(point) === cellKey(cell)),
					),
			);
			const target = targets[0];

			if (target) {
				robot.returnRoute = [
					{ x: robot.x, y: robot.y },
					{ x: target.x, y: target.y },
				];
			}
		}
		const goal = robot.returnRoute.at(-1);

		if (!goal || robot.returnRoute.length <= 1) {
			if (!goal) delete robot.returnRoute;
			robot.status = "idle";

			return "idle";
		}
		const path = advanceAlongRoute(
			warehouse,
			robot,
			goal,
			robot.returnRoute,
			occupied,
			pathfinder,
		);
		if (!path) return "moving";
		robot.returnRoute = path;
		robot.status = "returning";

		return "moving";
	}
	const order = warehouse.orders.find((order) => order.id === task.orderId);

	if (order?.status !== "running") {
		delete robot.currentTask;
		robot.status = "idle";

		return "idle";
	}
	if (
		cellKey(task.route[0] || { x: -1, y: -1 }) !== cellKey(robot) ||
		(!task.route.length && cellKey(robot) !== cellKey(task.target))
	) {
		task.route = pathfinder([robot], [task.target]);
	}
	if (robot.x !== task.target.x || robot.y !== task.target.y) {
		const path = advanceAlongRoute(
			warehouse,
			robot,
			task.target,
			task.route,
			occupied,
			pathfinder,
		);
		if (!path) return "moving";
		task.route = path;
		robot.status = task.carrying ? "carrying" : "moving";

		return "moving";
	}
	task.actionTicks++;
	robot.status = "working";
	if (task.actionTicks < Math.max(1, robot.duration)) {
		return "moving";
	}
	task.actionTicks = 0;
	if (task.phase === "pickup") {
		task.phase = "delivery";
		task.carrying = true;
		task.target = task.destination;
		task.label =
			order.kind === "inbound" ? "Размещение груза" : "Доставка к погрузке";
		task.route = task.deliveryRoute || pathfinder([robot], [task.target]);
		robot.status = "carrying";
		order.stage = 1;

		return "moving";
	}
	return "delivered";
}
