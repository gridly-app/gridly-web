import { expect, test } from "bun:test";

import type { Robot } from "@/domain/warehouse";

import { robotCounts } from "./useMapSimulation";

function robot(id: string, status: string): Robot {
	return {
		id,
		name: id,
		roles: [],
		x: 0,
		y: 0,
		speed: 1,
		duration: 1,
		capacity: "1",
		status,
	};
}

const robots = [
	robot("r1", "moving"),
	robot("r2", "carrying"),
	robot("r3", "idle"),
	robot("r4", "charging"),
];

test("without a summary the toolbar counts loaded robots", () => {
	expect(robotCounts({ robots })).toEqual({ robotCount: 4, activeRobots: 2 });
});

test("the server summary wins over the loaded robots", () => {
	expect(
		robotCounts({ robots, summary: { robotCount: 10, activeRobots: 7 } }),
	).toEqual({ robotCount: 10, activeRobots: 7 });
});

test("a summary with zero active robots is shown as zero", () => {
	expect(
		robotCounts({ robots, summary: { robotCount: 4, activeRobots: 0 } }),
	).toEqual({ robotCount: 4, activeRobots: 0 });
});
