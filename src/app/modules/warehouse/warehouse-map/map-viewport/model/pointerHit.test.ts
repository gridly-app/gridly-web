import { expect, test } from "bun:test";
import { pointerHit } from "./pointerHit";

test("pointer coordinates follow the canvas offset, scale and grid inset", () => {
	const bounds = { left: 180, top: 50 };

	expect(pointerHit({ clientX: 232, clientY: 119 }, bounds, 18, 32)).toEqual({
		canvasX: 52,
		canvasY: 69,
		x: 1,
		y: 2,
	});
	expect(pointerHit({ clientX: 211, clientY: 82 }, bounds, 18, 32).x).toBe(-1);
});

test("zoom and pan preserve the selected cell at its scaled center", () => {
	const gridInset = 32;
	const originalBounds = { left: 100, top: 40 };
	const movedBounds = { left: 220, top: 74 };
	const original = pointerHit(
		{ clientX: 182, clientY: 102 },
		originalBounds,
		20,
		gridInset,
	);
	const moved = pointerHit(
		{ clientX: 352, clientY: 166 },
		movedBounds,
		40,
		gridInset,
	);

	expect(original).toMatchObject({ x: 2, y: 1 });
	expect(moved).toMatchObject({ x: 2, y: 1 });
});
