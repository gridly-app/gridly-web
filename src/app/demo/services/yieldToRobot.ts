import {
	cellKey,
	createWarehousePathfinder,
	type Robot,
	type Warehouse,
} from "@/entities/warehouse";

export function yieldToRobot(
	warehouse: Warehouse,
	robot: Robot,
	next: { x: number; y: number },
	occupied: Set<string>,
	pathfinder = createWarehousePathfinder(warehouse.cells),
): boolean {
	const other = warehouse.robots.find(
		(other) => other.id !== robot.id && cellKey(other) === cellKey(next),
	);
	const otherNext = other?.currentTask?.route[1] || other?.returnRoute?.[1];

	if (!otherNext || cellKey(otherNext) !== cellKey(robot)) {
		return false;
	}
	const side = warehouse.cells.find(
		(cell) =>
			cell.type === "aisle" &&
			Math.abs(cell.x - robot.x) + Math.abs(cell.y - robot.y) === 1 &&
			!occupied.has(cellKey(cell)) &&
			!warehouse.robots.some(
				(other) =>
					other.currentTask &&
					cellKey(other.currentTask.target) === cellKey(cell),
			),
	);

	if (!side) {
		return false;
	}
	occupied.delete(cellKey(robot));
	robot.x = side.x;
	robot.y = side.y;
	occupied.add(cellKey(robot));
	if (robot.currentTask) {
		robot.currentTask.route = pathfinder([robot], [robot.currentTask.target]);
	} else {
		const destination = robot.returnRoute?.at(-1);
		if (!destination) return true;
		robot.returnRoute = pathfinder([robot], [destination]);
	}

	return true;
}
