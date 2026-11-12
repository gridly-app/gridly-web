import { expect, test } from "bun:test";
import { warehouseDto } from "@/entities/warehouse/api/contracts/warehouseDto";
import { parseResponse } from "@/shared/api";

test("warehouse REST metadata rejects an unsupported time zone", () => {
	const metadata = {
		id: "w",
		name: "Warehouse",
		width: 10,
		height: 10,
		time_zone: "UTC",
		workflow_policy: {
			confirm_unload: false,
			confirm_pick: false,
			confirm_putaway: false,
			confirm_load: false,
		},
		simulation_mode: "paused",
		worker_health: "ok",
		tick: 0,
		state_version: 0,
	};
	expect(parseResponse(warehouseDto, metadata).time_zone).toBe("UTC");
	expect(() =>
		parseResponse(warehouseDto, { ...metadata, time_zone: "Mars/Olympus" }),
	).toThrow("Сервер вернул некорректные данные");
});
