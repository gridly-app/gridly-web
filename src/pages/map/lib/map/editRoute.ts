import {
	type Cell,
	cellKey,
	type GridPosition,
	routeThrough,
} from "@/entities/warehouse";

export function moveRouteCell(
	cells: Cell[],
	path: GridPosition[],
	index: number,
	target: GridPosition,
): GridPosition[] {
	const last = path.at(-1);
	if (!last || !path[index])
		throw new Error("Выберите точку существующего маршрута");
	if (index === 0) {
		return routeThrough(cells, [target, last]);
	}
	if (index === path.length - 1) {
		return routeThrough(cells, [path[0], target]);
	}
	if (cellKey(path[index]) === cellKey(target)) {
		return path;
	}
	const replacement = routeThrough(
		cells,
		[path[index - 1], target, path[index + 1]],
		new Set([cellKey(path[index])]),
	);
	const result = [
		...path.slice(0, index - 1),
		...replacement,
		...path.slice(index + 2),
	];
	const simple: GridPosition[] = [];

	for (const point of result) {
		const repeated = simple.findIndex(
			(previous) => cellKey(previous) === cellKey(point),
		);

		if (repeated >= 0) {
			simple.splice(repeated + 1);
		} else {
			simple.push(point);
		}
	}

	return simple.some((point) => cellKey(point) === cellKey(target))
		? simple
		: result;
}
