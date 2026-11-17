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
