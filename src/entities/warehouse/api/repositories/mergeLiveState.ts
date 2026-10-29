import type {
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";

export function isApplicableLiveState(
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
): live is WarehouseLiveState {
	return (
		!!live?.stateVersion &&
		live.layoutVersion === snapshot.version &&
		BigInt(live.stateVersion) >
			BigInt(snapshot.stateVersion || snapshot.tick || "0")
	);
}

export function mergeLiveState(
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
): Warehouse {
	if (!isApplicableLiveState(snapshot, live)) return snapshot;
	const positions = new Map(live.robots.map((robot) => [robot.id, robot]));

	return {
		...snapshot,
		...live,
		running: live.running ?? snapshot.running,
		orders: live.orders ?? snapshot.orders,
		stock: live.stock ?? snapshot.stock,
		events: live.events ?? snapshot.events,
		robots: snapshot.robots.map((robot) => {
			const position = positions.get(robot.id);

			return position
				? {
						...robot,
						x: position.x,
						y: position.y,
						status: position.status,
						motionPath: position.motionPath,
						currentTask: position.currentTask,
						returnRoute: position.returnRoute,
					}
				: robot;
		}),
	};
}
