import {
	type Cell,
	cellKey,
	type GridPosition,
	routeThrough,
} from "@/domain/warehouse";
import { requiredAt, UserError } from "@/shared/lib";

function withoutLoops(path: GridPosition[]) {
	const simple: GridPosition[] = [];

	for (const point of path) {
		const repeated = simple.findIndex(
			(previous) => cellKey(previous) === cellKey(point),
		);

		if (repeated >= 0) {
			simple.splice(repeated + 1);

			continue;
		}

		simple.push(point);
	}

	return simple;
}

export function moveRouteCell(
	cells: Cell[],
	path: GridPosition[],
	index: number,
	target: GridPosition,
	allowStorage = false,
	blocked = new Set<string>(),
): GridPosition[] {
	const first = path[0];
	const last = path.at(-1);
	const moved = path[index];

	if (!first || !last || !moved)
		throw new UserError("Выберите точку существующего маршрута");
	if (index === 0)
		return routeThrough(cells, [target, last], blocked, allowStorage);
	if (index === path.length - 1)
		return routeThrough(cells, [first, target], blocked, allowStorage);
	if (cellKey(moved) === cellKey(target)) return path;

	const replacement = routeThrough(
		cells,
		[requiredAt(path, index - 1), target, requiredAt(path, index + 1)],
		new Set([...blocked, cellKey(moved)]),
		allowStorage,
	);
	const result = [
		...path.slice(0, index - 1),
		...replacement,
		...path.slice(index + 2),
	];
	const simple = withoutLoops(result);

	return simple.some((point) => cellKey(point) === cellKey(target))
		? simple
		: result;
}
