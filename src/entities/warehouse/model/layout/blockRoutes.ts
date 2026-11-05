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

export function defaultBlockRoutes(
	cells: Cell[],
	block: Cell[],
	allowStorage = false,
) {
	const blocked = new Set(block.map(cellKey));
	const index = new Map(
		cells
			.filter((cell) => !blocked.has(cellKey(cell)))
			.filter((cell) =>
				[
					"aisle",
					"unload",
					"load",
					"charge",
					...(allowStorage ? ["storage", "cold"] : []),
				].includes(cell.type),
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
		blocked,
		allowStorage,
	);
	const outbound = findWarehousePath(
		cells,
		[...index.values()].filter((cell) => access.has(cellKey(cell))),
		cells.filter((cell) => cell.type === "load"),
		blocked,
		allowStorage,
	);

	return { inbound, outbound };
}

export function routeThrough(
	cells: Cell[],
	points: GridPosition[],
	blocked = new Set<string>(),
	allowStorage = false,
): GridPosition[] {
	const result: GridPosition[] = [];

	for (let index = 1; index < points.length; index++) {
		const segment = findWarehousePath(
			cells,
			[requiredAt(points, index - 1)],
			[requiredAt(points, index)],
			blocked,
			allowStorage,
		);

		if (!segment.length) {
			throw new Error("Между выбранными точками нет прохода");
		}
		result.push(...(result.length ? segment.slice(1) : segment));
	}

	return result;
}

export function storageBlocks(cells: readonly Cell[]): Cell[][] {
	const index = new Map(
		cells
			.filter((c) => ["storage", "cold"].includes(c.type))
			.map((c) => [cellKey(c), c]),
	);
	const blocks: Cell[][] = [];
	while (index.size) {
		const first = index.values().next().value;
		if (!first) break;
		const block: Cell[] = [];
		const queue = [first];
		index.delete(cellKey(first));
		for (let i = 0; i < queue.length; i++) {
			const cell = queue[i];
			if (!cell) continue;
			block.push(cell);
			for (const key of neighbors(cell)) {
				const next = index.get(key);
				if (
					next &&
					next.type === first.type &&
					next.zone?.id === first.zone?.id
				) {
					index.delete(key);
					queue.push(next);
				}
			}
		}
		blocks.push(block);
	}
	return blocks;
}
