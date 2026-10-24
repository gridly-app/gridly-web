import type { Cell, Warehouse } from "../warehouse/schemas";
import { validateMap } from "./validateMap";

export function resizeWarehouse(
	warehouse: Warehouse,
	width: number,
	height: number,
): Cell[] {
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width < 5 ||
		height < 5 ||
		width > 100 ||
		height > 100
	) {
		throw new Error("Размеры должны быть целыми числами от 5 до 100");
	}
	if (warehouse.running) {
		throw new Error("Поставьте склад на паузу перед изменением размера");
	}
	if (warehouse.draft) {
		throw new Error(
			"Опубликуйте или отмените черновик перед изменением размера",
		);
	}
	const outside = (x: number, y: number) => x >= width || y >= height;

	if (
		warehouse.robots.some((robot) => outside(robot.x, robot.y)) ||
		warehouse.stock.some((stock) => {
			const [x, y] = stock.cell.split(",").map(Number);

			return outside(x, y);
		})
	) {
		throw new Error("Нельзя обрезать клетки с роботами или товарами");
	}
	const previous = new Map(
		(warehouse.draft || warehouse.cells).map((cell) => [
			`${cell.x},${cell.y}`,
			cell,
		]),
	);

	const docks = new Map<string, Cell>();

	for (const cell of warehouse.cells.filter((cell) =>
		["unload", "load"].includes(cell.type),
	)) {
		const x = cell.x === warehouse.width - 1 ? width - 1 : cell.x;
		const y = cell.y === warehouse.height - 1 ? height - 1 : cell.y;

		if (x < width && y < height) {
			docks.set(`${x},${y}`, { ...cell, x, y });
		}
	}
	const cells: Cell[] = Array.from({ length: width * height }, (_, index) => {
		const x = index % width;
		const y = Math.floor(index / width);
		const dock = docks.get(`${x},${y}`);

		if (dock) {
			return dock;
		}
		const old = previous.get(`${x},${y}`);
		const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;

		if (edge && warehouse.published) {
			return { x, y, type: "wall", capacity: 0 };
		}
		if (old) {
			const formerEdge =
				x === warehouse.width - 1 || y === warehouse.height - 1;

			return formerEdge && ["wall", "load", "unload"].includes(old.type)
				? { x, y, type: "aisle", capacity: 0 }
				: { ...old };
		}

		return { x, y, type: "aisle", capacity: 0 };
	});

	if (
		warehouse.stock.some((stock) => {
			const next = cells.find((cell) => `${cell.x},${cell.y}` === stock.cell);
			const old = previous.get(stock.cell);

			return next?.type !== old?.type;
		}) ||
		warehouse.robots.some(
			(robot) =>
				!cells.some(
					(cell) =>
						cell.x === robot.x &&
						cell.y === robot.y &&
						["aisle", "load", "unload", "charge"].includes(cell.type),
				),
		)
	) {
		throw new Error("Нельзя менять занятые клетки на границе склада");
	}
	if (warehouse.published) {
		const errors = validateMap(cells, width, height);

		if (errors.length) {
			throw new Error(errors.join("; "));
		}
	}

	return cells;
}
