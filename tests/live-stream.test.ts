import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { warehouseKeys } from "../src/entities/warehouse/api/queries/queryKeys";
import { WarehouseLiveStream } from "../src/entities/warehouse/api/repositories/liveStream";
import type { Warehouse } from "../src/entities/warehouse/model/warehouse/schemas";
import {
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "../src/pages/map/lib/map/robotMotion";
import { FetchHttpClient } from "../src/shared/api";
import { readSse, type ServerEvent } from "../src/shared/api/readSse";
import { warehouse } from "./support/warehouse";

const encoder = new TextEncoder();
async function until(check: () => boolean) {
	for (let i = 0; i < 200; i++) {
		if (check()) return;
		await Bun.sleep(5);
	}
	throw new Error("Timed out waiting for stream");
}
function channel() {
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
function patch(version = "2", changes: Record<string, unknown> = {}) {
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
function event(value: ReturnType<typeof patch>) {
	return `id: ${value.state_version}\nevent: STATE_PATCH\ndata: ${JSON.stringify(value)}\n\n`;
}
function harness(
	timing = { heartbeatMs: 10000, fallbackMs: 10, retryMs: [10] },
) {
	const cache = new QueryClient();
	cache.setQueryData(warehouseKeys.detail("w"), warehouse());
	const channels: ReturnType<typeof channel>[] = [];
	const urls: string[] = [];
	const errors: unknown[] = [];
	let resyncs = 0,
		polls = 0;
	const live = new WarehouseLiveStream(
		{
			id: "w",
			cache,
			timing,
			snapshotReady: () => true,
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
				const w = cache.getQueryData<Warehouse>(warehouseKeys.detail("w"));
				if (!w) throw new Error("Missing warehouse");
				return w;
			},
			poll: async () => {
				polls++;
				return { ...warehouse(), layoutVersion: 1 };
			},
		},
		(error) => errors.push(error),
	);
	return {
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
test("SSE decoder handles byte-split UTF8, CRLF, comments and multiline data", async () => {
	const bytes = encoder.encode(
		": heartbeat\r\nid: 2\r\nevent: STATE_PATCH\r\ndata: Привет\r\ndata: мир\r\n\r\n",
	);
	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			for (const byte of bytes) c.enqueue(new Uint8Array([byte]));
			c.close();
		},
	});
	const events: ServerEvent[] = [];
	let activity = 0;
	await readSse(
		stream,
		async (e) => {
			events.push(e);
		},
		() => activity++,
		new AbortController().signal,
	);
	expect(events).toEqual([
		{ id: "2", event: "STATE_PATCH", data: "Привет\nмир" },
	]);
	expect(activity).toBe(bytes.length);
});
test("stream transport refreshes account bearer and does not parse event data as JSON", async () => {
	const auth: string[] = [];
	const source = channel();
	let aborted = false;
	const client = new FetchHttpClient("/api", async (url, init) => {
		if (String(url).endsWith("/auth/refresh"))
			return Response.json({ access_token: "fresh" });
		const token = new Headers(init?.headers).get("Authorization");
		auth.push(token ?? "");
		if (!token)
			return Response.json({ error: { message: "Expired" } }, { status: 401 });
		init?.signal?.addEventListener("abort", () => {
			aborted = true;
		});
		return new Response(source.stream, {
			headers: { "Content-Type": "text/event-stream" },
		});
	});
	const stream = await client.openStream("/stream");
	const reader = stream.getReader();
	source.send(": heartbeat\n\n");
	expect(new TextDecoder().decode((await reader.read()).value)).toContain(
		"heartbeat",
	);
	expect(auth).toEqual(["", "Bearer fresh"]);
	client.clearSession();
	expect(aborted).toBe(true);
	source.send("data: old session\n\n");
	await expect(reader.read()).rejects.toMatchObject({ name: "AbortError" });
});
test("demo stream sends its own bearer without refresh or cookies", async () => {
	const calls: string[] = [];
	const client = new FetchHttpClient(
		"/api",
		async (url, init) => {
			calls.push(String(url));
			expect(init?.credentials).toBe("omit");
			expect(new Headers(init?.headers).get("Authorization")).toBe(
				"Bearer demo",
			);
			return Response.json({ error: { message: "Expired" } }, { status: 401 });
		},
		{ credentials: "omit", accessToken: () => "demo", refresh: false },
	);
	await expect(client.openStream("/stream")).rejects.toMatchObject({
		status: 401,
	});
	expect(calls).toEqual(["/api/stream"]);
});
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

test("repository shares a stream, skips healthy map polling and resyncs on resubscribe", async () => {
	const { RestWarehouseRepository } = await import(
		"../src/entities/warehouse/api/repositories/restRepository"
	);
	const { ApiError } = await import("../src/shared/api");
	const cache = new QueryClient();
	const channels: ReturnType<typeof channel>[] = [];
	let reads = 0,
		version = "1";
	const repo = new RestWarehouseRepository(
		{
			openStream: async () => {
				const next = channel();
				channels.push(next);
				return next.stream;
			},
			request: async (path) => {
				const url = new URL(path, "http://test");
				if (url.pathname === "/warehouses/w")
					return {
						id: "w",
						name: "Warehouse",
						width: 3,
						height: 3,
						time_zone: "UTC",
						revision: 1,
						published_version: 1,
						workflow_policy: {
							confirm_unload: false,
							confirm_pick: false,
							confirm_putaway: false,
							confirm_load: false,
						},
						simulation_mode: "running",
						worker_health: "healthy",
						tick: version,
						state_version: version,
					};
				if (url.pathname.endsWith("/layout/draft"))
					throw new ApiError("No draft", 404);
				if (url.pathname.endsWith("/layout"))
					return { version: 1, width: 3, height: 3, cells: [] };
				if (url.pathname.endsWith("/map/state")) {
					reads++;
					return {
						warehouse_id: "w",
						layout_version: 1,
						state_version: version,
						tick: version,
						robots: [
							{ id: "r", x: version === "1" ? 0 : 2, y: 0, status: "moving" },
						],
					};
				}
				if (url.pathname.endsWith("/robots"))
					return [
						{
							id: "r",
							name: "Robot",
							roles: ["ship"],
							speed: 1,
							action_ticks: 1,
							capacity_volume: "10",
							x: 0,
							y: 0,
							status: "idle",
							revision: 1,
						},
					];
				throw new Error(`Unexpected request ${path}`);
			},
		},
		cache,
	);
	await repo.get("w", undefined, "map");
	const releaseFirst = repo.subscribeLive("w"),
		releaseSecond = repo.subscribeLive("w");
	try {
		await until(() => channels.length === 1);
		version = "2";
		channels[0]?.send(event(patch()));
		await until(
			() =>
				cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))
					?.stateVersion === "2",
		);
		await repo.get("w", undefined, "map");
		expect(reads).toBe(1);
		releaseFirst();
		await Bun.sleep(10);
		expect(channels[0]?.canceled).toBe(false);
		releaseSecond();
		await until(() => channels[0]?.canceled === true);
		const releaseNext = repo.subscribeLive("w");
		await until(() => channels.length === 2);
		expect(reads).toBe(2);
		repo.clear();
		await until(() => channels[1]?.canceled === true);
		releaseNext();
		expect(cache.getQueryData(warehouseKeys.detail("w"))).toBeUndefined();
	} finally {
		releaseFirst();
		releaseSecond();
		repo.clear();
		cache.clear();
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
