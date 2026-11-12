import { UserError } from "@/shared/lib";
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
	if (r.id && !old)
		throw new UserError("Робот больше не существует. Обновите данные.");
	if (
		"x" in r &&
		(!warehouse.published ||
			!warehouse.cells.some(
				(c) =>
					c.x === r.x &&
					c.y === r.y &&
					(c.type === "aisle" || c.type === "charge"),
			) ||
			warehouse.robots.some((robot) => robot.x === r.x && robot.y === r.y))
	) {
		throw new UserError(
			"Выберите свободную клетку прохода или зарядки опубликованной карты.",
		);
	}
	const placement = old
		? { revision: requireRevision(r.revision ?? old.revision) }
		: "x" in r
			? { x: r.x, y: r.y }
			: {};
	await send(
		`/robots${old ? `/${encodeURIComponent(r.id ?? "")}` : ""}`,
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

	await mutate(`${base}/robots/${encodeURIComponent(command.value)}`, {
		method: "DELETE",
		headers: {
			"If-Match": `"${requireRevision(warehouse.robots.find((robot) => robot.id === command.value)?.revision)}"`,
		},
	});
}
