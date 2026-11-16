import { expect, test } from "bun:test";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "@/app/warehouse/warehouse-map/lib/canvas/robotMotion";
import type { Cell } from "@/domain/warehouse";
import { storageBlocks } from "@/domain/warehouse/layout/blockRoutes";
import { findWarehousePath } from "@/domain/warehouse/layout/findWarehousePath";
import { requiredAt } from "@/shared/invariants";

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
