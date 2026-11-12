import { expect, test } from "bun:test";
import { warehouseKeys } from "@/entities/warehouse/api/queries/queryKeys";
import type { Warehouse } from "@/entities/warehouse/model/warehouse";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "@/pages/map/lib/canvas/robotMotion";

import { event, harness, patch, until } from "./liveStreamFixture";

test("patch updates positions once, retains idle microsteps and invalidates affected resources", async () => {
	const h = harness();
	const invalidated: string[] = [];
	h.cache.getQueryCache().subscribe((e) => {
		if (e.type === "updated" && e.action.type === "invalidate")
			invalidated.push(JSON.stringify(e.query.queryKey));
	});
	for (const name of ["orders", "inventory", "history"])
		h.cache.setQueryData(warehouseKeys.resource("w", name), {});
	h.live.start();
	try {
		await until(() => h.live.healthy);
		const source = h.channels[0];
		if (!source) throw new Error("Missing stream");
		source.send(
			event(
				patch("2", {
					order_changes: [{ order_id: "o", status: "in_progress" }],
					stock_changes: [{ batch_id: "b", quantity: 2, reserved_quantity: 0 }],
				}),
			),
		);
		await until(
			() =>
				h.cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))
					?.stateVersion === "2",
		);
		const robot = h.cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))
			?.robots[0];
		expect(h.cache.getQueryData(warehouseKeys.live("w"))).not.toHaveProperty(
			"stock",
		);
		expect(robot?.motionPath).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			{ x: 2, y: 0 },
			{ x: 2, y: 0 },
		]);
		if (!robot?.motionPath) throw new Error("Missing motion");
		const track = prepareRobotMotionTrack({
			target: robot,
			path: robot.motionPath,
			startedAt: 0,
			duration: 1000,
			timed: robot.motionTimed,
		});
		expect(robotMotionPosition(track, 300)).toEqual({ x: 1, y: 0 });
		expect(invalidated).toContain(
			JSON.stringify(warehouseKeys.resource("w", "inventory")),
		);
		source.send(event(patch("2", { robots: [] })));
		await Bun.sleep(15);
		expect(h.resyncs).toBe(0);
		expect(h.polls).toBe(0);
	} finally {
		h.live.stop();
		h.cache.clear();
	}
});
test("gaps, unknown robots, malformed patches and RESYNC_REQUIRED reload before reconnect", async () => {
	for (const message of [
		event(patch("4")),
		event(
			patch("2", {
				robots: [
					{
						robot_id: "unknown",
						from: { x: 0, y: 0 },
						to: { x: 1, y: 0 },
						status: "idle",
					},
				],
			}),
		),
		"event: STATE_PATCH\ndata: {}\n\n",
		"event: RESYNC_REQUIRED\ndata: {}\n\n",
		event(patch("2", { warehouse_id: "other" })),
	]) {
		const h = harness();
		h.live.start();
		try {
			await until(() => h.live.healthy);
			h.channels[0]?.send(message);
			await until(() => h.resyncs > 0 && h.channels.length > 1);
			expect(
				h.cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))
					?.stateVersion,
			).toBe("1");
			expect(h.urls[1]).toContain("since_version=1");
		} finally {
			h.live.stop();
			h.cache.clear();
		}
	}
});
test("invalid trajectories and layout changes resynchronize rather than enter the cache", async () => {
	for (const changes of [
		{ layout_version: 2 },
		{
			robots: [
				{
					robot_id: "r",
					from: { x: 0, y: 0 },
					to: { x: 9, y: 0 },
					status: "moving",
				},
			],
		},
		{
			robots: [
				{
					robot_id: "r",
					from: { x: 0, y: 0 },
					to: { x: 1, y: 0 },
					status: "moving",
					microsteps: [{ slot: 1, from: { x: 2, y: 0 }, to: { x: 1, y: 0 } }],
				},
			],
		},
	]) {
		const h = harness();
		h.live.start();
		try {
			await until(() => h.live.healthy);
			h.channels[0]?.send(event(patch("2", changes)));
			await until(() => h.resyncs > 0);
			expect(
				h.cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))?.robots[0]
					?.x,
			).toBe(0);
		} finally {
			h.live.stop();
			h.cache.clear();
		}
	}
});
