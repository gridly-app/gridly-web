import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { warehouseKeys } from "@/entities/warehouse/api/queries/queryKeys";
import { RestWarehouseRepository } from "@/entities/warehouse/api/repositories/restRepository";
import { ApiError } from "@/shared/api";

const metadata = {
	id: "w",
	name: "Warehouse",
	width: 3,
	height: 3,
	time_zone: "Europe/Moscow",
	workflow_policy: {
		confirm_unload: false,
		confirm_pick: false,
		confirm_putaway: false,
		confirm_load: false,
	},
	simulation_mode: "paused",
	worker_health: "healthy",
	tick: "1",
	state_version: "1",
};

test("REST rejects an unknown warehouse time zone before caching metadata", async () => {
	const cache = new QueryClient();
	const repository = new RestWarehouseRepository(
		{
			request: async () => ({ ...metadata, time_zone: "Mars/Olympus" }),
		},
		cache,
	);

	await expect(
		repository.get("w", undefined, "metadata"),
	).rejects.toMatchObject({
		status: 502,
		code: "INVALID_RESPONSE",
	});
	expect(cache.getQueryData(warehouseKeys.detail("w"))).toBeUndefined();
});

test("a full REST snapshot preserves the published trajectory at an equal numeric version", async () => {
	const cache = new QueryClient();
	let restVersion = "1";
	const repository = new RestWarehouseRepository(
		{
			async request(path) {
				if (path === "/warehouses/w") return metadata;
				if (path.endsWith("/layout/draft")) throw new ApiError("No draft", 404);
				if (path.includes("/robots"))
					return [
						{
							id: "robot",
							name: "Robot",
							roles: [],
							speed: 1,
							action_ticks: 1,
							capacity_volume: "1",
							status: "idle",
							x: 1,
							y: 0,
						},
					];
				if (path.endsWith("/map/state"))
					return {
						warehouse_id: "w",
						layout_version: 0,
						state_version: restVersion,
						tick: restVersion,
						robots: [],
					};
				throw new Error(`Unexpected request: ${path}`);
			},
		},
		cache,
	);
	const snapshot = await repository.get("w", undefined, "map");
	const motionPath = [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
	];
	cache.setQueryData(warehouseKeys.detail("w"), {
		...snapshot,
		stateVersion: "2",
		robots: snapshot.robots.map((robot) => ({
			...robot,
			motionPath,
			motionTimed: true,
		})),
	});

	restVersion = "02";
	const result = await repository.get("w", undefined, "map");
	expect(result.stateVersion).toBe("2");
	expect(result.robots[0]).toMatchObject({ motionPath, motionTimed: true });
});
