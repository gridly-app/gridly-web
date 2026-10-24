import type { BlockRoutePlan, Cell, GridPosition } from "../warehouse/schemas";
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
		const key = queue[i];
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
			[points[index - 1]],
			[points[index]],
			blocked,
		);

		if (!segment.length) {
			throw new Error("Между выбранными точками нет прохода");
		}
		result.push(...(result.length ? segment.slice(1) : segment));
	}

	return result;
}

export function validateRoutePlans(
	cells: Cell[],
	plans: BlockRoutePlan[],
): void {
	const index = new Map(cells.map((cell) => [cellKey(cell), cell]));

	for (const plan of plans) {
		const block = connectedBlock(cells, index.get(plan.keys[0]) || null);

		if (
			!block.length ||
			block.some((cell) => !["storage", "cold"].includes(cell.type)) ||
			block.length !== plan.keys.length ||
			block.some((cell) => !plan.keys.includes(cellKey(cell)))
		) {
			throw new Error("Блок хранения изменился. Выберите его заново");
		}
		const adjacent = (point: GridPosition) =>
			block.some(
				(cell) => Math.abs(cell.x - point.x) + Math.abs(cell.y - point.y) === 1,
			);

		for (const direction of ["inbound", "outbound"] as const) {
			const path = plan[direction];
			const first = path[0];
			const last = path.at(-1);

			if (
				!first ||
				!last ||
				(direction === "inbound"
					? index.get(cellKey(first))?.type !== "unload" || !adjacent(last)
					: !adjacent(first) || index.get(cellKey(last))?.type !== "load")
			) {
				throw new Error(
					"Путь должен соединять док и проход рядом с выбранным блоком",
				);
			}
			path.forEach((point, position) => {
				if (
					!["aisle", "charge", "unload", "load"].includes(
						index.get(cellKey(point))?.type || "",
					) ||
					(position > 0 &&
						Math.abs(point.x - path[position - 1].x) +
							Math.abs(point.y - path[position - 1].y) !==
							1)
				) {
					throw new Error(
						"Маршрут должен проходить по соседним свободным клеткам",
					);
				}
			});
		}
	}
}

export function optimizeWarehouseRoutes(cells: Cell[]): BlockRoutePlan[] {
	const visited = new Set<string>();
	const plans: BlockRoutePlan[] = [];

	for (const cell of cells) {
		if (
			!["storage", "cold"].includes(cell.type) ||
			visited.has(cellKey(cell))
		) {
			continue;
		}
		const block = connectedBlock(cells, cell);
		const keys = block.map(cellKey).sort();

		for (const key of keys) visited.add(key);
		const routes = defaultBlockRoutes(cells, block);

		if (!routes.inbound.length || !routes.outbound.length) {
			throw new Error(`Нет пути к блоку ${cell.zone?.name || keys[0]}`);
		}
		plans.push({
			id: keys[0],
			keys,
			...routes,
			inboundVia: [],
			outboundVia: [],
		});
	}

	return plans;
}
