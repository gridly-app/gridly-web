import type { CommandHandlers } from "./commandHandlers";

export const robotHandlers: Pick<CommandHandlers, "robot" | "deleteRobot"> = {
	robot(warehouse, input) {
		if (!warehouse.published) {
			throw new Error("Опубликуйте карту");
		}
		const old = warehouse.robots.find((r) => r.id === input.id);
		if (old?.currentTask) throw new Error("Дождитесь завершения задачи робота");
		const position =
			old ||
			warehouse.cells.find(
				(c) =>
					["aisle", "charge"].includes(c.type) &&
					!warehouse.robots.some((r) => r.x === c.x && r.y === c.y),
			);

		if (!position) {
			throw new Error("Нет свободного места для нового робота");
		}
		const robot = { ...input, x: position.x, y: position.y };
		const cell = warehouse.cells.find(
			(c) => c.x === robot.x && c.y === robot.y,
		);

		if (!cell || !["aisle", "charge"].includes(cell.type)) {
			throw new Error("Выберите свободную клетку прохода или зарядки");
		}
		warehouse.robots = warehouse.robots
			.filter((r) => r.id !== robot.id)
			.concat(robot);
	},
	deleteRobot(warehouse, id) {
		const robot = warehouse.robots.find((r) => r.id === id);

		if (!robot) {
			throw new Error("Робот не найден");
		}
		if (robot.status !== "idle") {
			throw new Error("Можно удалить только свободного робота");
		}
		warehouse.robots = warehouse.robots.filter((r) => r.id !== id);
	},
};
