import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { WarehouseLiveState } from "@/domain/warehouse";
import { httpDouble } from "../../../../../../tests/support/http";

import { RestWarehouseRepository } from "./restRepository";

import { warehouseRepositoryFixture } from "./warehouseRepository.test-support";

describe("REST warehouse snapshots", () => {
	test("rejects mixed metadata and layout versions or dimensions", async () => {
		for (const layout of [
			{ version: 2, width: 3, height: 3, cells: [], routes: [] },
			{ version: 1, width: 4, height: 4, cells: [], routes: [] },
		]) {
			const base = warehouseRepositoryFixture();
			const repository = new RestWarehouseRepository(
				httpDouble({
					async request(path, options) {
						if (path.endsWith("/layout")) return layout;
						if (path.endsWith("/map/state"))
							return {
								warehouse_id: "w1",
								layout_version: layout.version,
								state_version: "1",
								tick: "1",
								robots: [],
							};
						return base.http.request(path, options);
					},
				}),
			);
			await expect(repository.get("w1", undefined, "map")).rejects.toThrow(
				"Карта изменилась",
			);
		}
	});

	test("a delayed layout read leaves newer live motion paths intact", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		let version = 1;
		let delay = false;
		let release!: () => void;
		let started!: () => void;
		const waiting = new Promise<void>((resolve) => {
			started = resolve;
		});
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (new URL(path, "http://localhost").pathname.endsWith("/robots"))
						return [
							{
								id: "r1",
								name: "Robot",
								x: 0,
								y: 0,
								status: "moving",
								roles: ["ship"],
								speed: 1,
								action_ticks: 1,
								capacity_volume: "1",
							},
						];
					if (new URL(path, "http://localhost").pathname.endsWith("/map/state"))
						return {
							warehouse_id: "w1",
							layout_version: 1,
							state_version: String(version),
							tick: String(version),
							robots: [
								{
									id: "r1",
									x: version - 1,
									y: 0,
									status: "moving",
									motion_path: [
										{ x: 0, y: 0 },
										{ x: version - 1, y: 0 },
									],
								},
							],
						};
					if (
						delay &&
						new URL(path, "http://localhost").pathname.endsWith("/layout/draft")
					) {
						started();
						await new Promise<void>((resolve) => {
							release = resolve;
						});
					}
					if (path.endsWith("/layout/draft"))
						return {
							version: 1,
							revision: 1,
							width: 3,
							height: 3,
							cells: [],
							routes: [],
						};

					return base.http.request(path, options);
				},
			}),
			cache,
		);
		await repository.getLive("w1");
		delay = true;
		const old = repository.get("w1", undefined, "map");
		await waiting;
		version = 2;
		await repository.getLive("w1");
		release();
		await old;

		const cached = cache.getQueryData<WarehouseLiveState>(
			repository.keys.live("w1"),
		);

		expect(cached?.stateVersion).toBe("2");
		expect(cached?.robots[0]?.motionPath).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		]);
	});
	test("paginates collection envelopes and retains existing query parameters", async () => {
		const { repository, calls } = warehouseRepositoryFixture();
		const warehouses = await repository.list();
		expect(warehouses).toHaveLength(101);
		expect(warehouses.at(-1)?.id).toBe("last");
		expect(calls[1]).toBe(
			"/warehouses?include_summary=true&limit=100&offset=100",
		);
	});

	test("normalizes snapshots and caches published layouts until session reset", async () => {
		const { repository, calls } = warehouseRepositoryFixture();
		const warehouse = await repository.get("w1", undefined, "map");
		expect(warehouse.cells).toHaveLength(9);
		expect(warehouse.draft).toBeNull();
		await repository.get("w1", undefined, "map");
		expect(calls.filter((path) => path.endsWith("/layout"))).toHaveLength(1);
		repository.clear();
		await repository.get("w1", undefined, "map");
		expect(calls.filter((path) => path.endsWith("/layout"))).toHaveLength(2);
	});

	test("does not roll back a newer live state when an older update arrives", async () => {
		const { repository, setVersion } = warehouseRepositoryFixture();
		await repository.get("w1", undefined, "map");
		setVersion("9007199254740995");
		expect((await repository.getLive("w1")).stateVersion).toBe(
			"9007199254740995",
		);
		setVersion("2");
		expect((await repository.getLive("w1")).stateVersion).toBe(
			"9007199254740995",
		);
	});

	test("legacy map envelopes with null robots remain supported", async () => {
		const { repository, useLegacy } = warehouseRepositoryFixture();
		useLegacy();
		expect((await repository.getLive("w1")).robots).toEqual([]);
		expect((await repository.getLive("w1")).layoutVersion).toBe(1);
	});

	test("the warehouse card is read with its summary", async () => {
		const base = warehouseRepositoryFixture();
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (path === "/warehouses/w1?include_summary=true")
						return {
							...((await base.http.request(path, options)) as object),
							summary: { robotCount: 10, activeRobots: 2 },
						};

					return base.http.request(path, options);
				},
			}),
		);

		const warehouse = await repository.get("w1", undefined, "metadata");

		expect(warehouse.summary).toEqual({ robotCount: 10, activeRobots: 2 });
	});

	test("map polling does not ask for a draft again after the server said there is none", async () => {
		const { repository, calls } = warehouseRepositoryFixture();
		const draftReads = () =>
			calls.filter((path) => path.endsWith("/layout/draft")).length;

		await repository.get("w1", undefined, "map");
		await repository.get("w1", undefined, "map");
		await repository.get("w1", undefined, "map");

		expect(draftReads()).toBe(1);

		repository.clear();
		await repository.get("w1", undefined, "map");

		expect(draftReads()).toBe(2);
	});

	test("map polling keeps reading an existing draft", async () => {
		const base = warehouseRepositoryFixture();
		let draftReads = 0;
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (!path.endsWith("/layout/draft"))
						return base.http.request(path, options);

					draftReads++;

					return {
						version: 1,
						revision: 4,
						width: 3,
						height: 3,
						cells: [],
						routes: [],
					};
				},
			}),
		);

		await repository.get("w1", undefined, "map");
		const warehouse = await repository.get("w1", undefined, "map");

		expect(draftReads).toBe(2);
		expect(warehouse.draftRevision).toBe(4);
	});
});
