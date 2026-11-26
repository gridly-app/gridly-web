import { expect, test } from "bun:test";
import type { Warehouse } from "@/domain/warehouse/warehouse";

import { event, harness, patch, until } from "./liveStream.test-support";

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
				h.cache.getQueryData<Warehouse>(h.keys.detail("w"))?.stateVersion,
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
				h.cache.getQueryData<Warehouse>(h.keys.detail("w"))?.robots[0]?.x,
			).toBe(0);
		} finally {
			h.live.stop();
			h.cache.clear();
		}
	}
});
