import type { WarehouseRobots } from "./resources";
import type { Warehouse, WarehouseLiveState } from "./warehouse";

export type RobotMotion = WarehouseLiveState["robots"][number];

export function mergeRobotPositions(
	robots: WarehouseRobots["robots"],
	positions: RobotMotion[],
) {
	const byId = new Map(positions.map((robot) => [robot.id, robot]));

	return robots.map((robot) => {
		const position = byId.get(robot.id);

		return position ? { ...robot, ...position } : robot;
	});
}

export function isApplicableLiveState(
	snapshot: Pick<Warehouse, "version" | "stateVersion" | "tick">,
	live?: WarehouseLiveState,
): live is WarehouseLiveState {
	return (
		!!live?.stateVersion &&
		live.layoutVersion === snapshot.version &&
		BigInt(live.stateVersion) >= BigInt(snapshot.stateVersion ?? snapshot.tick)
	);
}
