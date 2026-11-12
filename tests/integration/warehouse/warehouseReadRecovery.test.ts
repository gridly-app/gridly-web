import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseRepository } from "@/entities/warehouse";
import { warehouseKeys } from "@/entities/warehouse/api/queries/queryKeys";

import { ApiError } from "@/shared/api";

import {
	warehouseDto,
	warehouseRepositoryFixture,
} from "./warehouseRepositoryFixture";

function waitForCancellation(signal: AbortSignal | undefined) {
	if (!signal) throw new Error("Expected a cancellable request");
	signal.throwIfAborted();
	return new Promise<never>((_, reject) => {
		signal.addEventListener("abort", () => reject(signal.reason), {
			once: true,
		});
	});
}

describe("REST warehouse recovery", () => {
	test("an initial map read times out without publishing an incomplete snapshot", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		let firstRobotsRead = true;
		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					if (path.includes("/robots") && firstRobotsRead) {
						firstRobotsRead = false;
						return waitForCancellation(options?.signal);
					}
					return base.http.request(path, options);
				},
			},
			cache,
			25,
		);

		await expect(repository.get("w1", undefined, "map")).rejects.toMatchObject({
			name: "TimeoutError",
		});
		expect(cache.getQueryData(warehouseKeys.detail("w1"))).toBeUndefined();
		await expect(repository.get("w1", undefined, "map")).resolves.toMatchObject(
			{
				version: 1,
				stateVersion: "1",
			},
		);
	});

	test("stream startup retries when the first map snapshot hangs", async () => {
		const base = warehouseRepositoryFixture();
		let firstRobotsRead = true;
		const { promise: opened, resolve: streamOpened } =
			Promise.withResolvers<string>();
		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					if (path.includes("/robots") && firstRobotsRead) {
						firstRobotsRead = false;
						return waitForCancellation(options?.signal);
					}
					return base.http.request(path, options);
				},
				async openStream(path) {
					streamOpened(path);
					return new ReadableStream<Uint8Array>();
				},
			},
			new QueryClient(),
			25,
		);
		const release = repository.subscribeLive("w1");
		try {
			await expect(opened).resolves.toBe(
				"/warehouses/w1/stream?since_version=1",
			);
		} finally {
			release();
			repository.clear();
		}
	});

	test("fallback polling resumes after an individual map state request hangs", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		let polls = 0;
		let failedPoll: AbortSignal | undefined;
		const { promise: updated, resolve: mapUpdated } =
			Promise.withResolvers<void>();
		const unsubscribe = cache.getQueryCache().subscribe(() => {
			const live = cache.getQueryData<{ stateVersion: string }>(
				warehouseKeys.live("w1"),
			);
			if (live?.stateVersion === "2") mapUpdated();
		});
		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					if (path.includes("/map/state?after_version=")) {
						if (++polls === 1) {
							failedPoll = options?.signal;
							return waitForCancellation(failedPoll);
						}
						base.setVersion("2");
					}
					return base.http.request(path, options);
				},
				async openStream() {
					throw new ApiError("Stream unavailable", 403);
				},
			},
			cache,
			25,
		);
		await repository.get("w1", undefined, "map");
		const release = repository.subscribeLive("w1");
		try {
			await updated;
			expect(polls).toBeGreaterThanOrEqual(2);
			expect(failedPoll?.reason).toMatchObject({ name: "TimeoutError" });
			expect(cache.getQueryData(warehouseKeys.connection("w1"))).toBe(false);
		} finally {
			release();
			unsubscribe();
			repository.clear();
		}
	});

	test("stream resync reads a new layout without canceling its own requests", async () => {
		const cache = new QueryClient();
		let publishedVersion = 1;
		const sources: ReadableStreamDefaultController<Uint8Array>[] = [];
		let resumed!: () => void;
		const reconnected = new Promise<void>((resolve) => {
			resumed = resolve;
		});
		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					options?.signal?.throwIfAborted();
					if (path.endsWith("/layout/draft"))
						throw new ApiError("No draft", 404);
					if (path.endsWith("/layout"))
						return {
							version: publishedVersion,
							width: 3,
							height: 3,
							cells: [],
						};
					if (path.includes("/map/state"))
						return {
							warehouse_id: "w1",
							layout_version: publishedVersion,
							state_version: String(publishedVersion),
							tick: String(publishedVersion),
							robots: [],
						};
					if (path.endsWith("/w1"))
						return { ...warehouseDto, published_version: publishedVersion };
					return [];
				},
				async openStream() {
					return new ReadableStream({
						start(controller) {
							sources.push(controller);
							if (sources.length === 2) resumed();
						},
					});
				},
			},
			cache,
		);
		await repository.get("w1");
		const release = repository.subscribeLive("w1");
		try {
			publishedVersion = 2;
			sources[0]?.enqueue(
				new TextEncoder().encode("event: RESYNC_REQUIRED\ndata: {}\n\n"),
			);
			await reconnected;
			expect(cache.getQueryData(warehouseKeys.live("w1"))).toMatchObject({
				layoutVersion: 2,
				stateVersion: "2",
			});
		} finally {
			release();
			repository.clear();
		}
	});
});
