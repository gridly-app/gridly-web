import { describe, expect, test } from "bun:test";
import { DemoRuntime } from "../src/app/demo/runtime/DemoRuntime";
import { createWarehouse } from "../src/entities/warehouse";

describe("warehouse demo repository", () => {
	test("stopped sessions cannot read or mutate warehouses", async () => {
		const runtime = new DemoRuntime(() => ({
			warehouses: [createWarehouse("Demo", 3, 3)],
		}));
		await expect(runtime.list()).rejects.toHaveProperty("name", "AbortError");
		runtime.start();
		runtime.stop();
		await expect(
			runtime.create(createWarehouse("Closed", 2, 2)),
		).rejects.toHaveProperty("name", "AbortError");
	});

	test("settings and layout commands persist through the public repository interface", async () => {
		const original = createWarehouse("Demo", 3, 3);
		const runtime = new DemoRuntime(() => ({ warehouses: [original] }));
		runtime.start();
		try {
			const [warehouse] = await runtime.list();
			const changed = await runtime.execute(warehouse.id, {
				action: "settings",
				value: {
					name: "Renamed",
					timezone: "Europe/Moscow",
					policy: [true, false, false, false],
				},
			});
			expect(changed.name).toBe("Renamed");
			const draft = changed.cells.map((cell) => ({
				...cell,
				type: "aisle" as const,
			}));
			await runtime.execute(warehouse.id, { action: "draft", value: draft });
			expect((await runtime.get(warehouse.id)).draft).toEqual(draft);
			await runtime.execute(warehouse.id, {
				action: "discard",
				value: undefined,
			});
			expect((await runtime.get(warehouse.id)).draft).toBeNull();
			expect(original.name).toBe("Demo");
		} finally {
			runtime.stop();
		}
	});

	test("snapshots are isolated from callers and aborted requests reject", async () => {
		const runtime = new DemoRuntime(() => ({
			warehouses: [createWarehouse("Demo", 3, 3)],
		}));
		runtime.start();
		try {
			const [warehouse] = await runtime.list();
			warehouse.name = "Client mutation";
			expect((await runtime.get(warehouse.id)).name).toBe("Demo");
			const controller = new AbortController();
			controller.abort();
			await expect(
				runtime.get(warehouse.id, controller.signal),
			).rejects.toHaveProperty("name", "AbortError");
			const live = await runtime.getLive(warehouse.id);
			expect(live.layoutVersion).toBe(warehouse.version);
			expect(live.robots).toEqual(warehouse.robots);
		} finally {
			runtime.stop();
		}
	});
});
