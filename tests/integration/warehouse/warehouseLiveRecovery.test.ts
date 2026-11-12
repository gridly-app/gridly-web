import { expect, test } from "bun:test";
import { QueryObserver } from "@tanstack/react-query";
import { warehouseKeys } from "@/entities/warehouse/api/queries/queryKeys";
import type { Warehouse } from "@/entities/warehouse/model/warehouse";

import { event, harness, patch, until } from "./liveStreamFixture";

test("resource events finish the active read and queue one follow-up", async () => {
	const h = harness();
	const queryKey = warehouseKeys.resource("w", "inventory");
	h.cache.setQueryData(queryKey, 0);
	let reads = 0;
	let canceled = false;
	let finishRead!: () => void;
	const observer = new QueryObserver(h.cache, {
		queryKey,
		staleTime: Infinity,
		queryFn: async ({ signal }) => {
			const read = ++reads;
			if (read === 1) {
				await new Promise<void>((resolve) => {
					finishRead = resolve;
					signal.addEventListener("abort", () => {
						canceled = true;
						resolve();
					});
				});
			}
			return read;
		},
	});
	const unsubscribe = observer.subscribe(() => undefined);
	h.live.start();
	try {
		await until(() => h.live.healthy);
		const source = h.channels[0];
		if (!source) throw new Error("Missing stream");
		const stock_changes = [
			{ batch_id: "b", quantity: 2, reserved_quantity: 0 },
		];
		source.send(event(patch("2", { stock_changes })));
		await until(() => reads === 1);
		source.send(event(patch("3", { stock_changes })));
		source.send(event(patch("4", { stock_changes })));
		await until(
			() =>
				h.cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))
					?.stateVersion === "4",
		);
		expect(reads).toBe(1);
		expect(canceled).toBe(false);
		finishRead();
		await until(() => h.cache.getQueryData(queryKey) === 2);
		expect(reads).toBe(2);
	} finally {
		h.live.stop();
		unsubscribe();
		h.cache.clear();
	}
});
test("heartbeat watchdog reconnects, fallback polls only while unavailable, stop cancels everything", async () => {
	const h = harness({ heartbeatMs: 30, fallbackMs: 5, retryMs: [25] });
	h.live.start();
	try {
		await until(() => h.live.healthy);
		h.channels[0]?.send(": heartbeat\n\n");
		await until(() => h.polls > 0);
		await until(() => h.channels.length > 1);
		h.live.stop();
		const streams = h.channels.length,
			polls = h.polls;
		await Bun.sleep(70);
		expect(h.channels.length).toBe(streams);
		expect(h.polls).toBe(polls);
		expect(h.channels.every((s) => s.canceled)).toBe(true);
	} finally {
		h.live.stop();
		h.cache.clear();
	}
});
