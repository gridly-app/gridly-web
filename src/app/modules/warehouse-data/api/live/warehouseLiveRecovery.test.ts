import { expect, jest, test } from "bun:test";
import { QueryObserver } from "@tanstack/react-query";
import type { WarehouseLiveState } from "@/domain/warehouse/warehouse";

import {
	advanceBy,
	event,
	harness,
	patch,
	until,
	untilAdvanced,
} from "./liveStream.test-support";

test("resource events finish the active read and queue one follow-up", async () => {
	const h = harness();
	const queryKey = h.keys.resource("w", "inventory");
	h.cache.setQueryData(queryKey, { stock: [] });
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
			return { stock: [], read };
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
				h.cache.getQueryData<WarehouseLiveState>(h.keys.live("w"))
					?.stateVersion === "4",
		);
		expect(reads).toBe(1);
		expect(canceled).toBe(false);
		finishRead();
		await until(() => observer.getCurrentResult().data?.read === 2);
		expect(reads).toBe(2);
	} finally {
		h.live.stop();
		unsubscribe();
		h.cache.clear();
	}
});
test("heartbeat watchdog reconnects, fallback polls only while unavailable, stop cancels everything", async () => {
	jest.useFakeTimers();

	const h = harness({ heartbeatMs: 30, fallbackMs: 5, retryMs: [25] });

	h.live.start();

	try {
		await untilAdvanced(() => h.live.healthy);
		h.channels[0]?.send(": heartbeat\n\n");
		await untilAdvanced(() => h.polls > 0);
		await untilAdvanced(() => h.channels.length > 1);

		const pollsBeforeOutage = h.polls;

		h.live.invalidate();
		await untilAdvanced(() => h.polls > pollsBeforeOutage);
		h.live.stop();

		const streams = h.channels.length;
		const polls = h.polls;

		await advanceBy(100);

		expect(h.channels.length).toBe(streams);
		expect(h.polls).toBe(polls);
		expect(h.channels.every((stream) => stream.canceled)).toBe(true);
		expect(jest.getTimerCount()).toBe(0);
	} finally {
		h.live.stop();
		h.cache.clear();
		jest.useRealTimers();
	}
});
