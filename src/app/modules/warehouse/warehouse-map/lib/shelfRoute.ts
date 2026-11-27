import { type Cell, cellKey, type GridPosition } from "@/domain/warehouse";

type RouteDirection = "inbound" | "outbound";

const edgeInsetPixels = 2;

function isAdjacent(cell: GridPosition, point: GridPosition) {
	return Math.abs(cell.x - point.x) + Math.abs(cell.y - point.y) === 1;
}

export function exteriorShelfRoute(
	path: readonly GridPosition[],
	block: readonly Cell[],
	direction: RouteDirection,
): GridPosition[] {
	const keys = new Set(block.map(cellKey));

	if (direction === "inbound") {
		const firstInside = path.findIndex((point) => keys.has(cellKey(point)));

		return firstInside < 0 ? [...path] : path.slice(0, firstInside);
	}

	const firstOutside = path.findIndex((point) => !keys.has(cellKey(point)));

	return firstOutside < 0 ? [] : path.slice(firstOutside);
}

export function shelfRoutePoints(
	path: readonly GridPosition[],
	block: readonly Cell[],
	direction: RouteDirection,
	size: number,
): GridPosition[] {
	if (!path.length || !block.length) return [...path];

	const isInbound = direction === "inbound";
	const outside = exteriorShelfRoute(path, block, direction);
	const endpoint = isInbound ? outside.at(-1) : outside[0];

	if (!endpoint) return [];

	const adjacent = block.filter((cell) => isAdjacent(cell, endpoint));
	const originalShelfPoint = isInbound
		? path[outside.length]
		: path[path.length - outside.length - 1];
	const originalKey = originalShelfPoint && cellKey(originalShelfPoint);
	const shelf =
		adjacent.find((cell) => cellKey(cell) === originalKey) ?? adjacent[0];

	if (!shelf) return outside;

	const offset = 0.5 + edgeInsetPixels / size;
	const edge = {
		x: endpoint.x + (shelf.x - endpoint.x) * offset,
		y: endpoint.y + (shelf.y - endpoint.y) * offset,
	};

	return isInbound ? [...outside, edge] : [edge, ...outside];
}
