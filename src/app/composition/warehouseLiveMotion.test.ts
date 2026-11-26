import { expect, test } from "bun:test";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "@/app/modules/warehouse/warehouse-map/lib/canvas/robotMotion";
import type { WarehouseLiveState } from "@/domain/warehouse";

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
	h.cache.setQueryData(h.keys.resource("w", "orders"), { orders: [] });
	h.cache.setQueryData(h.keys.resource("w", "inventory"), { stock: [] });
	h.cache.setQueryData(h.keys.resource("w", "history"), { events: [] });
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
				h.cache.getQueryData<WarehouseLiveState>(h.keys.live("w"))
					?.stateVersion === "2",
		);
		const robot = h.cache.getQueryData<WarehouseLiveState>(h.keys.live("w"))
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
		source.send(event(patch("3")));
		await until(
			() =>
				h.cache.getQueryData<WarehouseLiveState>(h.keys.live("w"))
					?.stateVersion === "3",
		);
		expect(h.resyncs).toBe(1);
		expect(h.polls).toBe(0);
	} finally {
		h.live.stop();
		h.cache.clear();
	}
});
