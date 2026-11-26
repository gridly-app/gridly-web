import { jest } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { WarehouseLiveStream } from "./liveStream";
import { createWarehouseKeys } from "../../model/queries/queryKeys";
import type { WarehouseLiveState } from "@/domain/warehouse/warehouse";
import { warehouse } from "../../../../../../tests/support/warehouse";

const encoder = new TextEncoder();
export async function until(check: () => boolean) {
	for (let i = 0; i < 200; i++) {
		if (check()) return;
		await Bun.sleep(5);
	}
	throw new Error("Timed out waiting for stream");
}
async function flushMicrotasks() {
	for (let i = 0; i < 20; i++) await Promise.resolve();
}

export async function untilAdvanced(check: () => boolean) {
	for (let elapsed = 0; elapsed < 1000; elapsed++) {
		await flushMicrotasks();

		if (check()) return;

		jest.advanceTimersByTime(1);
	}

	throw new Error("Timed out waiting for stream on fake timers");
}

export async function advanceBy(milliseconds: number) {
	for (let elapsed = 0; elapsed < milliseconds; elapsed++) {
		jest.advanceTimersByTime(1);
		await flushMicrotasks();
	}
}

export function channel() {
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	let canceled = false;
	const stream = new ReadableStream<Uint8Array>({
		start(value) {
			controller = value;
		},
		cancel() {
			canceled = true;
		},
	});
	return {
		stream,
		send(text: string) {
			controller.enqueue(encoder.encode(text));
		},
		close() {
			controller.close();
		},
		get canceled() {
			return canceled;
		},
	};
}
export function patch(version = "2", changes: Record<string, unknown> = {}) {
	return {
		warehouse_id: "w",
		tick: version,
		state_version: version,
		committed_at: "2026-11-10T10:00:00Z",
		robots: [
			{
				robot_id: "r",
				from: { x: 0, y: 0 },
				to: { x: 2, y: 0 },
				status: "moving",
				microsteps: [
					{ slot: 1, from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
					{ slot: 2, from: { x: 1, y: 0 }, to: { x: 1, y: 0 } },
					{ slot: 3, from: { x: 1, y: 0 }, to: { x: 2, y: 0 } },
					{ slot: 4, from: { x: 2, y: 0 }, to: { x: 2, y: 0 } },
					{ slot: 5, from: { x: 2, y: 0 }, to: { x: 2, y: 0 } },
				],
			},
		],
		tasks: [],
		stock_changes: [],
		order_changes: [],
		...changes,
	};
}
export function event(value: ReturnType<typeof patch>) {
	return `id: ${value.state_version}\nevent: STATE_PATCH\ndata: ${JSON.stringify(value)}\n\n`;
}
export function harness(
	timing = { heartbeatMs: 10000, fallbackMs: 10, retryMs: [10] },
) {
	const cache = new QueryClient();
	const warehouseKeys = createWarehouseKeys("stream-test");
	const fixture = warehouse();
	cache.setQueryData(warehouseKeys.resource("w", "map"), {
		width: fixture.width,
		height: fixture.height,
		version: fixture.version,
		published: fixture.published,
		cells: fixture.cells,
		draft: fixture.draft,
	});
	cache.setQueryData(warehouseKeys.live("w"), {
		layoutVersion: fixture.version,
		tick: fixture.tick,
		stateVersion: fixture.stateVersion,
		robots: fixture.robots,
	});
	const channels: ReturnType<typeof channel>[] = [];
	const urls: string[] = [];
	const errors: unknown[] = [];
	let resyncs = 0,
		polls = 0;
	const live = new WarehouseLiveStream(
		{
			id: "w",
			keys: warehouseKeys,
			cache,
			timing,
			http: {
				request: async () => undefined,
				openStream: async (url) => {
					urls.push(url);
					const next = channel();
					channels.push(next);
					return next.stream;
				},
			},
			resync: async (signal) => {
				signal.throwIfAborted();
				resyncs++;
				const w = cache.getQueryData<WarehouseLiveState>(
					warehouseKeys.live("w"),
				);
				if (!w) throw new Error("Missing warehouse");
				return w;
			},
			poll: async () => {
				polls++;
				return { ...warehouse(), layoutVersion: 1 };
			},
		},
		{ onError: (error) => errors.push(error), onHealthy: () => undefined },
	);
	return {
		keys: warehouseKeys,
		live,
		cache,
		channels,
		urls,
		errors,
		get resyncs() {
			return resyncs;
		},
		get polls() {
			return polls;
		},
	};
}
