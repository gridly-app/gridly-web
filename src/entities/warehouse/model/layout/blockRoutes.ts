import { requiredAt } from "@/shared/lib/requiredAt";
import type { Cell, GridPosition } from "../warehouse/schemas";
import { findWarehousePath } from "./findWarehousePath";
import { cellKey } from "./zones";

const neighbors = (cell: Cell) =>
	[
		[cell.x + 1, cell.y],
		[cell.x - 1, cell.y],
		[cell.x, cell.y + 1],
		[cell.x, cell.y - 1],
	].map(([x, y]) => `${x},${y}`);

export function connectedBlock(cells: Cell[], selected: Cell | null): Cell[] {
	if (!selected) {
		return [];
	}
	if (!["storage", "cold"].includes(selected.type)) {
		return [selected];
	}
	const index = new Map(
		cells
			.filter(
				(cell) =>
					cell.type === selected.type && cell.zone?.id === selected.zone?.id,
			)
			.map((cell) => [cellKey(cell), cell]),
	);
	const visited = new Set<string>();
	const queue = [cellKey(selected)];
	const result: Cell[] = [];

	for (let i = 0; i < queue.length; i++) {
		const key = requiredAt(queue, i);
		const cell = index.get(key);

		if (!cell || visited.has(key)) {
			continue;
		}
		visited.add(key);
		result.push(cell);
		queue.push(...neighbors(cell));
	}

	return result;
}

export function defaultBlockRoutes(cells: Cell[], block: Cell[]) {
	const index = new Map(
		cells
			.filter((cell) =>
				["aisle", "unload", "load", "charge"].includes(cell.type),
			)
			.map((cell) => [cellKey(cell), cell]),
	);
	const access = new Set(
		block.flatMap(neighbors).filter((key) => index.has(key)),
	);
	const inbound = findWarehousePath(
		cells,
		cells.filter((cell) => cell.type === "unload"),
		[...index.values()].filter((cell) => access.has(cellKey(cell))),
	);
	const outbound = findWarehousePath(
		cells,
		[...index.values()].filter((cell) => access.has(cellKey(cell))),
		cells.filter((cell) => cell.type === "load"),
	);

	return { inbound, outbound };
}

export function routeThrough(
	cells: Cell[],
	points: GridPosition[],
	blocked = new Set<string>(),
): GridPosition[] {
	const result: GridPosition[] = [];

	for (let index = 1; index < points.length; index++) {
		const segment = findWarehousePath(
			cells,
			[requiredAt(points, index - 1)],
			[requiredAt(points, index)],
			blocked,
		);

		if (!segment.length) {
			throw new Error("Между выбранными точками нет прохода");
		}
		result.push(...(result.length ? segment.slice(1) : segment));
	}

	return result;
}
