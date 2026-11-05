import { type Cell, cellKey, type GridPosition } from "@/entities/warehouse";

/** Project only the displayed shelf connection. Robot motion uses the full server path. */
export function shelfRoutePoints(
	path: readonly GridPosition[],
	block: readonly Cell[],
	direction: "inbound" | "outbound",
	size: number,
): GridPosition[] {
	if (!path.length || !block.length) return [...path];
	const outside = exteriorShelfRoute(path, block, direction);
	const endpoint = direction === "inbound" ? outside.at(-1) : outside[0];
	if (!endpoint) return [];
	const adjacent = block.filter(
		(cell) =>
			Math.abs(cell.x - endpoint.x) + Math.abs(cell.y - endpoint.y) === 1,
	);
	const originalShelfPoint =
		direction === "inbound"
			? path[outside.length]
			: path[path.length - outside.length - 1];
	const shelf =
		adjacent.find(
			(cell) =>
				originalShelfPoint && cellKey(cell) === cellKey(originalShelfPoint),
		) ?? adjacent[0];
	if (!shelf) return outside;
	// Half a cell plus the shelf's 2px outer inset reaches its painted face.
	const offset = 0.5 + 2 / size;
	const edge = {
		x: endpoint.x + (shelf.x - endpoint.x) * offset,
		y: endpoint.y + (shelf.y - endpoint.y) * offset,
	};
	return direction === "inbound" ? [...outside, edge] : [edge, ...outside];
}

/** Keep the stored approach on exterior cells; the pickup leg belongs to the robot task. */
export function exteriorShelfRoute(
	path: readonly GridPosition[],
	block: readonly Cell[],
	direction: "inbound" | "outbound",
): GridPosition[] {
	const keys = new Set(block.map(cellKey));
	if (direction === "inbound") {
		const firstInside = path.findIndex((point) => keys.has(cellKey(point)));
		return [...(firstInside < 0 ? path : path.slice(0, firstInside))];
	}
	const firstOutside = path.findIndex((point) => !keys.has(cellKey(point)));
	return firstOutside < 0 ? [] : [...path.slice(firstOutside)];
}
