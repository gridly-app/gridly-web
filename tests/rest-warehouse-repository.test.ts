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
