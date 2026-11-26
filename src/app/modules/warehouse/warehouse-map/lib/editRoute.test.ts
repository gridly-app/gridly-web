import { expect, test } from "bun:test";
import type { Cell } from "@/domain/warehouse";

import { moveRouteCell } from "./editRoute";

const path = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 2, y: 0 },
];
const lowerRow = [
	{ x: 0, y: 1 },
	{ x: 1, y: 1 },
	{ x: 2, y: 1 },
];
const cells: Cell[] = [...path, ...lowerRow].map((point) => ({
	...point,
	type: "aisle",
}));

test("dragging an interior point preserves endpoints and finds a continuous detour", () => {
	expect(moveRouteCell(cells, path, 1, { x: 1, y: 1 })).toMatchObject([
		{ x: 0, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 2, y: 0 },
	]);
});

test("a route point cannot cross a wall or end at an unreachable cell", () => {
	const divided = cells.map((cell): Cell =>
		cell.x === 1 ? { ...cell, type: "wall" } : cell,
	);

	expect(() => moveRouteCell(divided, path, 1, { x: 2, y: 1 })).toThrow(
		"нет прохода",
	);
	expect(path).toEqual([
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
	]);
});
