import { describe, expect, test } from "bun:test";
import { RestWarehouseRepository } from "../src/entities/warehouse";

import { ApiError, type RequestOptions } from "../src/shared/api";

const warehouseDto = {
	id: "w1",
	name: "Warehouse",
	width: 3,
	height: 3,
	time_zone: "Europe/Moscow",
	published_version: 1,
	revision: 2,
	simulation_mode: "paused",
	worker_health: "healthy",
	tick: "1",
	state_version: "1",
	workflow_policy: {
		confirm_unload: false,
		confirm_pick: false,
		confirm_putaway: false,
		confirm_load: false,
	},
};
function fixture() {
	const calls: string[] = [];
	let stateVersion = "1";
	let legacy = false;
	const http = {
		async request(path: string, _options?: RequestOptions): Promise<unknown> {
			calls.push(path);
			const url = new URL(path, "http://localhost");
			if (url.pathname === "/warehouses/w1") return warehouseDto;
			if (url.pathname.endsWith("/layout/draft"))
				throw new ApiError("No draft", 404);
			if (url.pathname.endsWith("/layout"))
				return { version: 1, width: 3, height: 3, cells: [] };
			if (url.pathname.endsWith("/map/state"))
				return legacy
					? {
							warehouse: { ...warehouseDto, state_version: stateVersion },
							robots: null,
						}
					: {
							warehouse_id: "w1",
							layout_version: 1,
							state_version: stateVersion,
							tick: stateVersion,
							robots: [],
						};
			if (url.pathname === "/warehouses") {
				const offset = Number(url.searchParams.get("offset"));
				return {
					items:
						offset === 0
							? Array.from({ length: 100 }, (_, i) => ({
									...warehouseDto,
									id: `w${i}`,
								}))
							: [{ ...warehouseDto, id: "last" }],
					total: 101,
				};
			}
			return [];
		},
	};
	return {
		http,
		repository: new RestWarehouseRepository(http),
		calls,
		setVersion: (value: string) => {
			stateVersion = value;
		},
		useLegacy: () => {
			legacy = true;
		},
	};
}

describe("REST warehouse synchronization", () => {
	test("route proposals preserve zone boundaries including new zones", async () => {
		let body: unknown;
		const repository = new RestWarehouseRepository({
			async request(_path, options) {
				body = options?.body;
				return [];
			},
		});
		await repository.proposeRoutes("w1", [
			{
				x: 0,
				y: 0,
				type: "storage",
				capacity: 20,
				zone: { id: "draft-a", name: "A", categoryId: "c1" },
			},
			{
				x: 1,
				y: 0,
				type: "storage",
				capacity: 20,
				zone: { id: "draft-b", name: "B", categoryId: "c1" },
			},
		]);
		expect(body).toMatchObject({
			cells: [
				{ zone: { client_id: "draft-a", name: "A", category_id: "c1" } },
				{ zone: { client_id: "draft-b", name: "B", category_id: "c1" } },
			],
		});
	});

	test("rejects mixed metadata and layout versions or dimensions", async () => {
		for (const layout of [
			{ version: 2, width: 3, height: 3, cells: [] },
			{ version: 1, width: 4, height: 4, cells: [] },
		]) {
			const base = fixture();
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
		const base = fixture();
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
		expect(snapshot.robots[0].motionPath).toEqual(live.robots[0].motionPath);
	});
	test("paginates collection envelopes and retains existing query parameters", async () => {
		const { repository, calls } = fixture();
		const warehouses = await repository.list();
		expect(warehouses).toHaveLength(101);
		expect(warehouses.at(-1)?.id).toBe("last");
		expect(calls[1]).toBe(
			"/warehouses?include_summary=true&limit=100&offset=100",
		);
	});

	test("normalizes snapshots and caches published layouts until session reset", async () => {
		const { repository, calls } = fixture();
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
		const { repository, setVersion } = fixture();
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
		const { repository, useLegacy } = fixture();
		useLegacy();
		expect((await repository.get("w1")).robots).toEqual([]);
		expect((await repository.getLive("w1")).layoutVersion).toBe(1);
	});
});
