import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { WarehouseLiveState } from "@/domain/warehouse/warehouse";

import { channel, event, patch, until } from "./liveStream.test-support";

test("repository shares a stream, skips healthy map polling and resyncs on resubscribe", async () => {
	const { RestWarehouseRepository } =
		await import("../repositories/restRepository");
	const { ApiError } = await import("@/shared/http");
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
					return { version: 1, width: 3, height: 3, cells: [], routes: [] };
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
				cache.getQueryData<WarehouseLiveState>(repo.keys.live("w"))
					?.stateVersion === "2",
		);
		await repo.get("w", undefined, "map");
		expect(reads).toBe(1);
		releaseFirst();
		version = "3";
		channels[0]?.send(event(patch("3")));
		await until(
			() =>
				cache.getQueryData<WarehouseLiveState>(repo.keys.live("w"))
					?.stateVersion === "3",
		);
		expect(channels[0]?.canceled).toBe(false);
		releaseSecond();
		await until(() => channels[0]?.canceled === true);
		const releaseNext = repo.subscribeLive("w");
		await until(() => channels.length === 2);
		expect(reads).toBe(2);
		repo.clear();
		await until(() => channels[1]?.canceled === true);
		releaseNext();
		expect(cache.getQueryData(repo.keys.live("w"))).toBeUndefined();
	} finally {
		releaseFirst();
		releaseSecond();
		repo.clear();
		cache.clear();
	}
});
