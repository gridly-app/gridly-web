import {
	type Cell,
	cellKey,
	type GridPosition,
	routeThrough,
} from "@/entities/warehouse";
import { requiredAt, UserError } from "@/shared/lib";

export function moveRouteCell(
	cells: Cell[],
	path: GridPosition[],
	index: number,
	target: GridPosition,
	allowStorage = false,
	blocked = new Set<string>(),
): GridPosition[] {
	const last = path.at(-1);
	if (!last || !path[index])
		throw new UserError("Выберите точку существующего маршрута");
	if (index === 0) {
		return routeThrough(cells, [target, last], blocked, allowStorage);
	}
	if (index === path.length - 1) {
		return routeThrough(
			cells,
			[requiredAt(path, 0), target],
			blocked,
			allowStorage,
		);
	}
	if (cellKey(requiredAt(path, index)) === cellKey(target)) {
		return path;
	}
	const replacement = routeThrough(
		cells,
		[requiredAt(path, index - 1), target, requiredAt(path, index + 1)],
		new Set([...blocked, cellKey(requiredAt(path, index))]),
		allowStorage,
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
