import type { Robot, Warehouse, WarehouseLiveState } from "./warehouse";

export function toLiveState(warehouse: Warehouse): WarehouseLiveState {
	return {
		layoutVersion: warehouse.version,
		stateVersion: warehouse.stateVersion,
		tick: warehouse.tick,
		asOf: warehouse.asOf,
		robots: warehouse.robots,
	};
}

export function mergeRobotPositions(robots: Robot[], positions: Robot[]) {
	const byId = new Map(positions.map((robot) => [robot.id, robot]));

	return robots.map((robot) => {
		const position = byId.get(robot.id);
		if (!position) return robot;

		return {
			...robot,
			x: position.x,
			y: position.y,
			status: position.status,
			motionPath: position.motionPath,
			motionTimed: position.motionTimed,
		};
	});
}

export function isApplicableLiveState(
	snapshot: Warehouse,
	live?: WarehouseLiveState,
): live is WarehouseLiveState {
	return (
		!!live?.stateVersion &&
		live.layoutVersion === snapshot.version &&
		BigInt(live.stateVersion) >
			BigInt(snapshot.stateVersion || snapshot.tick || "0")
	);
}

export function selectWarehouseMotion(
	snapshot: Warehouse,
	live?: WarehouseLiveState,
) {
	if (!isApplicableLiveState(snapshot, live)) {
		return {
			robots: snapshot.robots,
			stateVersion: snapshot.stateVersion,
			tick: snapshot.tick,
			asOf: snapshot.asOf,
		};
	}

	return {
		robots: mergeRobotPositions(snapshot.robots, live.robots),
		stateVersion: live.stateVersion,
		tick: live.tick,
		asOf: live.asOf,
	};
}
