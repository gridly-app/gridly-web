import { requiredAt } from "@/shared/lib/requiredAt";
import type { Cell, GridPosition } from "../warehouse/schemas";
import { cellKey } from "./zones";

export function findWarehousePath(
	cells: Cell[],
	starts: GridPosition[],
	targets: GridPosition[],
	blocked: Set<string> = new Set(),
	allowStorage = false,
): Cell[] {
	return createWarehousePathfinder(cells, allowStorage)(
		starts,
		targets,
		blocked,
	);
}

export function createWarehousePathfinder(
	cells: readonly Cell[],
	allowStorage = false,
) {
	const index = new Map(
		cells
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
	return (
		starts: readonly GridPosition[],
		targets: readonly GridPosition[],
		blocked: Set<string> = new Set(),
	): Cell[] => {
		const goal = new Set(targets.map(cellKey));
		const queue = starts
			.filter((cell) => index.has(cellKey(cell)) && !blocked.has(cellKey(cell)))
			.map(cellKey);
		const parents = new Map<string, string | null>(
			queue.map((key) => [key, null]),
		);

		for (let i = 0; i < queue.length; i++) {
			const key = requiredAt(queue, i);

			if (goal.has(key)) {
				const path: Cell[] = [];
				let current: string | null = key;

				while (current !== null) {
					const step = index.get(current);
					if (!step) return [];
					path.push(step);
					current = parents.get(current) ?? null;
				}

				return path.reverse();
			}
			const cell = index.get(key);
			if (!cell) continue;

			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			] as const) {
				const next = `${cell.x + dx},${cell.y + dy}`;

				if (index.has(next) && !blocked.has(next) && !parents.has(next)) {
					parents.set(next, key);
					queue.push(next);
				}
			}
		}

		return [];
	};
}
