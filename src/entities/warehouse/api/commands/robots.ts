import type { WarehouseCommand } from "../../model/commands/commands";
import type { RestCommandContext } from "./context";
import { requireRevision } from "./context";

export async function saveRobot(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "robot" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const r = command.value;
	const old = warehouse.robots.find((x) => x.id === r.id);
	const position = warehouse.cells.find(
		(cell) =>
			["aisle", "charge"].includes(cell.type) &&
			!warehouse.robots.some((n) => n.x === cell.x && n.y === cell.y),
	);

	if (!old && !position) {
		throw new Error("На опубликованной карте нет свободного места для робота");
	}
	const placement = old
		? { revision: requireRevision(r.revision ?? old.revision) }
		: position
			? { x: position.x, y: position.y }
			: {};
	await send(
		`/robots${old ? `/${r.id}` : ""}`,
		{
			...placement,
			name: r.name,
			roles: r.roles,
			speed: r.speed,
			action_ticks: r.duration,
			capacity_volume: Number(r.capacity),
		},
		old ? "PATCH" : "POST",
	);
}

export async function deleteRobot(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "deleteRobot" }>,
): Promise<void> {
	const { warehouse, base, mutate } = context;

	await mutate(`${base}/robots/${command.value}`, {
		method: "DELETE",
		headers: {
			"If-Match": `"${requireRevision(warehouse.robots.find((robot) => robot.id === command.value)?.revision)}"`,
		},
	});
}
