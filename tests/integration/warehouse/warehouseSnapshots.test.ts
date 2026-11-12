import { describe, expect, test } from "bun:test";
import { RestWarehouseRepository } from "@/entities/warehouse";

import { warehouseRepositoryFixture } from "./warehouseRepositoryFixture";

describe("REST warehouse snapshots", () => {
	test("rejects mixed metadata and layout versions or dimensions", async () => {
		for (const layout of [
			{ version: 2, width: 3, height: 3, cells: [] },
			{ version: 1, width: 4, height: 4, cells: [] },
		]) {
			const base = warehouseRepositoryFixture();
			const repository = new RestWarehouseRepository({
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
			});
			await expect(repository.get("w1")).rejects.toThrow("Карта изменилась");
		}
	});

	test("a delayed full snapshot retains newer live motion paths", async () => {
		const base = warehouseRepositoryFixture();
		let version = 1;
		let delay = false;
		let release!: () => void;
		let started!: () => void;
		const waiting = new Promise<void>((resolve) => {
			started = resolve;
		});
		const repository = new RestWarehouseRepository({
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
					new URL(path, "http://localhost").pathname.endsWith("/events")
				) {
					started();
					await new Promise<void>((resolve) => {
						release = resolve;
					});
				}
				return base.http.request(path, options);
			},
		});
		await repository.get("w1");
		delay = true;
		const old = repository.get("w1");
		await waiting;
		version = 2;
		const live = await repository.getLive("w1");
		release();
		const snapshot = await old;
		const robot = snapshot.robots[0];
		const liveRobot = live.robots[0];
		if (!robot || !liveRobot) throw new Error("Missing robot snapshot");
		expect(robot.motionPath).toEqual(liveRobot.motionPath);
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
		const warehouse = await repository.get("w1");
		expect(warehouse.cells).toHaveLength(9);
		expect(warehouse.draft).toBeNull();
		await repository.get("w1");
		expect(calls.filter((path) => path.endsWith("/layout"))).toHaveLength(1);
		repository.clear();
		await expect(repository.getLive("w1")).rejects.toThrow(
			"Сначала загрузите склад",
		);
		await repository.get("w1");
		expect(calls.filter((path) => path.endsWith("/layout"))).toHaveLength(2);
	});

	test("does not roll back a newer live state when an older update arrives", async () => {
		const { repository, setVersion } = warehouseRepositoryFixture();
		await repository.get("w1");
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
		expect((await repository.get("w1")).robots).toEqual([]);
		expect((await repository.getLive("w1")).layoutVersion).toBe(1);
	});
});
