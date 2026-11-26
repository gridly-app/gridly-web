import { expect, test } from "bun:test";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "@/app/modules/warehouse/warehouse-map/lib/canvas/robotMotion";
import type { Warehouse } from "@/domain/warehouse/warehouse";

import {
	event,
	harness,
	patch,
	until,
} from "../modules/warehouse-data/api/live/liveStream.test-support";

test("patch updates positions once, retains idle microsteps and invalidates affected resources", async () => {
	const h = harness();
	const invalidated: string[] = [];
	h.cache.getQueryCache().subscribe((e) => {
		if (e.type === "updated" && e.action.type === "invalidate")
			invalidated.push(JSON.stringify(e.query.queryKey));
	});
	for (const name of ["orders", "inventory", "history"])
		h.cache.setQueryData(h.keys.resource("w", name), {});
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
				h.cache.getQueryData<Warehouse>(h.keys.detail("w"))?.stateVersion ===
				"2",
		);
		const robot = h.cache.getQueryData<Warehouse>(h.keys.detail("w"))
			?.robots[0];
		expect(h.cache.getQueryData(h.keys.live("w"))).not.toHaveProperty("stock");
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
			JSON.stringify(h.keys.resource("w", "inventory")),
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
