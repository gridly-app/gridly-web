import type { WarehouseCommand } from "@/domain/warehouse";
import { UserError } from "@/shared/lib";
import type { RestCommandContext } from "../commands/context";
import { requireRevision } from "../commands/context";

export async function saveRobot(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "robot" }>,
): Promise<void> {
	const { resources, send, warehouse } = context;
	const r = command.value;
	const { map, robots } = resources;

	if (!robots) throw new UserError("Дождитесь синхронизации роботов");

	const old = robots.robots.find((x) => x.id === r.id);
	if (r.id && !old)
		throw new UserError("Робот больше не существует. Обновите данные.");
	if (
		"x" in r &&
		(!map?.published ||
			map.version !== warehouse.version ||
			!map.cells.some(
				(c) =>
					c.x === r.x &&
					c.y === r.y &&
					(c.type === "aisle" || c.type === "charge"),
			) ||
			robots.robots.some((robot) => robot.x === r.x && robot.y === r.y))
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
		old ? `/robots/${encodeURIComponent(old.id)}` : "/robots",
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
	const { resources, base, mutate } = context;

	await mutate(`${base}/robots/${encodeURIComponent(command.value)}`, {
		method: "DELETE",
		headers: {
			"If-Match": `"${requireRevision(resources.robots?.robots.find((robot) => robot.id === command.value)?.revision)}"`,
		},
	});
}
