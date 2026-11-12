import { expect, test } from "bun:test";
import type { Cell } from "@/entities/warehouse";
import { storageBlocks } from "@/entities/warehouse/model/layout/blockRoutes";
import { findWarehousePath } from "@/entities/warehouse/model/layout/findWarehousePath";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "@/pages/map/lib/canvas/robotMotion";
import { requiredAt } from "@/shared/lib/requiredAt";

test("shelves merge only within adjacent matching zones and mock paths can pass below storage", () => {
	const cells: Cell[] = [
		{ x: 0, y: 0, type: "unload" },
		{ x: 1, y: 0, type: "storage" },
		{ x: 2, y: 0, type: "cold" },
		{ x: 3, y: 0, type: "load" },
		{ x: 1, y: 1, type: "storage" },
		{ x: 1, y: 3, type: "storage" },
	];
	expect(
		storageBlocks(cells)
			.map((b) => b.length)
			.sort(),
	).toEqual([1, 1, 2]);
	expect(
		findWarehousePath(cells, [requiredAt(cells, 0)], [requiredAt(cells, 3)]),
	).toEqual([]);
	const path = findWarehousePath(
		cells,
		[requiredAt(cells, 0)],
		[requiredAt(cells, 3)],
		undefined,
		true,
	);
	expect(path.map((c) => c.type)).toEqual([
		"unload",
		"storage",
		"cold",
		"load",
	]);
	const track = prepareRobotMotionTrack({
		target: requiredAt(cells, 3),
		path,
		startedAt: 0,
		duration: 3000,
	});
	expect(robotMotionPosition(track, 1500)).toEqual({ x: 1.5, y: 0 });
});
