import { RestWarehouseRepository } from "@/entities/warehouse";

import { ApiError, type RequestOptions } from "@/shared/api";

export const warehouseDto = {
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

export function warehouseRepositoryFixture() {
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
