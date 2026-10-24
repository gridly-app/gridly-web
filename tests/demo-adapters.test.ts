import { expect, test } from "bun:test";
import { setupServer } from "msw/node";
import { commandHandlers } from "../src/app/demo/commands";
import { enrichDemo } from "../src/app/demo/fixtures/enrichDemo";
import { seed } from "../src/app/demo/fixtures/seed";
import { DemoRuntime } from "../src/app/demo/runtime/DemoRuntime";
import { DemoWarehouseStore } from "../src/app/demo/runtime/DemoWarehouseStore";
import { DemoTicker } from "../src/app/demo/services/DemoTicker";
import { WarehouseCommandService } from "../src/app/demo/services/WarehouseCommandService";
import { stepWarehouse } from "../src/app/demo/simulation/stepWarehouse";
import { DemoSessionStore } from "../src/app/mocks/services/DemoSessionStore";
import { LocalMockStore } from "../src/app/mocks/services/MockStore";
import { warehouseHandlers } from "../src/app/mocks/warehouseHandlers";
import {
	cancelOrder,
	createWarehouse,
	defaultBlockRoutes,
	warehouseLiveStateSchema,
	warehouseSchema,
} from "../src/entities/warehouse";
import { isApplicableLiveState } from "../src/entities/warehouse/api/repositories/mergeLiveState";

function clock() {
	let i = 0;
	return {
		now: () => new Date("2026-10-24T22:30:00Z"),
		nextId: () => `id-${++i}`,
	};
}
function fixture() {
	const w = createWarehouse("Test", 7, 5);
	w.id = "test";
	return { warehouses: [w], demoVersion: 4 };
}
function memory() {
	const data = new Map<string, string>();
	let fail = false;
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			if (fail) throw new Error("Storage full");
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
		fail: () => {
			fail = true;
		},
	};
}
test("paused tick and live reads do not clone layout; live snapshots stay isolated", async () => {
	const store = new DemoWarehouseStore(fixture);
	const ticker = new DemoTicker(store);
	const original = globalThis.structuredClone;
	let cells = 0;
	globalThis.structuredClone = ((value: unknown) => {
		for (const v of Array.isArray(value) ? value : [value])
			if (v && typeof v === "object" && "cells" in v)
				cells += (v as { cells: unknown[] }).cells.length;
		return original(value);
	}) as typeof structuredClone;
	try {
		ticker.advance();
		expect(cells).toBe(0);
		const live = store.getLive("demo-warehouse-1")!;
		expect(cells).toBe(0);
		live.events.push({ id: "x", time: "", title: "", detail: "" });
		expect(store.getLive("demo-warehouse-1")?.events).toHaveLength(0);
	} finally {
		globalThis.structuredClone = original;
	}
});
test("commands on pause advance stateVersion independently of tick and reject older live data", () => {
	const store = new DemoWarehouseStore(fixture),
		commands = new WarehouseCommandService(store, commandHandlers, clock());
	const old = store.getWarehouse("demo-warehouse-1")!;
	const result = commands.execute(old.id, {
		action: "settings",
		value: { name: "Changed", timezone: "Europe/Moscow", policy: [] },
	});
	expect(result.tick).toBe(old.tick);
	expect(BigInt(result.stateVersion!)).toBeGreaterThan(
		BigInt(old.stateVersion || "0"),
	);
	expect(isApplicableLiveState(old, store.getLive(old.id))).toBe(true);
	expect(
		isApplicableLiveState(result, {
			...store.getLive(old.id)!,
			stateVersion: "0",
		}),
	).toBe(false);
});
test("failed persistence does not publish a command or mutate old snapshots", () => {
	const storage = memory(),
		store = new LocalMockStore(storage, fixture);
	const old = store.listWarehouses()[0];
	storage.fail();
	const commands = new WarehouseCommandService(store, commandHandlers, clock());
	expect(() =>
		commands.execute(old.id, { action: "simulation", value: undefined }),
	).toThrow("Storage full");
	expect(store.getWarehouse(old.id)).toEqual(old);
});
test("failed simulation step does not publish partial changes to either warehouse", () => {
	const f = fixture();
	f.warehouses.push({
		...structuredClone(f.warehouses[0]),
		id: "second",
		name: "second",
	});
	const store = new DemoWarehouseStore(() => f);
	const snapshots = store.listWarehouses();
	for (const w of snapshots) w.running = true;
	store.saveWarehouses(snapshots);
	let calls = 0;
	const ticker = new DemoTicker(store, 500, {
		nextId: () => "id",
		now: () => {
			if (++calls === 2) throw new Error("clock failure");
			return new Date();
		},
	});
	expect(() => ticker.advance()).toThrow("clock failure");
	expect(store.listWarehouses()).toEqual(snapshots);
});
test("legacy allocation migration preserves stock, clears orphan reserves and is idempotent", () => {
	const w = seed(clock()).warehouses[0];
	w.demoVersion = 3;
	for (const o of w.orders) {
		delete o.allocations;
		delete o.processed;
		delete o.putaways;
	}
	const total = w.stock.reduce((n, s) => n + s.quantity, 0);
	enrichDemo(w, clock());
	expect(w.demoVersion).toBe(4);
	expect(w.stock.reduce((n, s) => n + s.quantity, 0)).toBe(total);
	for (const s of w.stock) {
		const held = w.orders
			.flatMap((o) => o.allocations || [])
			.filter((a) => a.stockId === s.id)
			.reduce((n, a) => n + a.quantity - a.delivered, 0);
		expect(s.reserved).toBe(held);
	}
	const migrated = structuredClone(w);
	enrichDemo(w, clock());
	expect(w).toEqual(migrated);
});
test("direct and HTTP adapters agree on live projection and commands", async () => {
	const f = fixture();
	const direct = new DemoRuntime(() => f);
	direct.start();
	const store = new DemoWarehouseStore(() => f);
	const server = setupServer(
		...warehouseHandlers(store, {
			baseUrl: "http://gridly.test/api/v1",
			latencyMs: 0,
			context: clock(),
		}),
	);
	server.listen({ onUnhandledRequest: "error" });
	const base = "http://gridly.test/api/v1/warehouses";
	try {
		const response = await fetch(`${base}/demo-warehouse-1/map-state`);
		expect(response.status).toBe(200);
		expect(warehouseLiveStateSchema.parse(await response.json())).toEqual(
			await direct.getLive("demo-warehouse-1"),
		);
		const changed = await fetch(`${base}/demo-warehouse-1/commands`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "settings",
				value: { name: "HTTP", timezone: "Europe/Moscow", policy: [] },
			}),
		});
		expect(changed.status).toBe(200);
		expect(warehouseSchema.parse(await changed.json()).name).toBe("HTTP");
		expect((await fetch(`${base}/missing/map-state`)).status).toBe(404);
		const invalid = await fetch(`${base}/demo-warehouse-1/commands`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "nonsense" }),
		});
		expect(invalid.status).toBe(400);
		const conflict = await fetch(`${base}/demo-warehouse-1/commands`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "start", value: "missing" }),
		});
		expect(conflict.status).toBe(409);
		const aborted = new AbortController();
		aborted.abort();
		await expect(
			direct.getLive("demo-warehouse-1", aborted.signal),
		).rejects.toHaveProperty("name", "AbortError");
	} finally {
		direct.stop();
		server.close();
	}
});
test("switching HTTP demo sessions resets isolated data and pauses every warehouse", () => {
	const persistent = new LocalMockStore(memory(), fixture);
	const session = new DemoSessionStore(persistent, fixture, true);
	const w = session.listWarehouses()[0];
	w.running = true;
	session.saveWarehouse(w);
	expect(session.runningWarehouseIds()).toEqual([w.id]);
	session.enterWorkspace();
	expect(session.runningWarehouseIds()).toEqual([]);
	expect(session.listWarehouses()[0].id).toBe("test");
	session.enterDemo();
	expect(session.runningWarehouseIds()).toEqual([]);
	expect(session.getLive(w.id)?.running).toBe(false);
});

test("ticker start/stop are idempotent and stopped timers cannot advance", () => {
	const interval = globalThis.setInterval,
		clear = globalThis.clearInterval;
	let starts = 0,
		stops = 0;
	globalThis.setInterval = ((_fn: unknown, _ms: unknown) => {
		starts++;
		return 123;
	}) as unknown as typeof setInterval;
	globalThis.clearInterval = (() => {
		stops++;
	}) as typeof clearInterval;
	try {
		const ticker = new DemoTicker(new DemoWarehouseStore(fixture));
		ticker.start();
		ticker.start();
		ticker.stop();
		ticker.stop();
		expect(starts).toBe(1);
		expect(stops).toBe(1);
	} finally {
		globalThis.setInterval = interval;
		globalThis.clearInterval = clear;
	}
});

test("legacy small fixtures migrate to a valid current scenario without losing stock", () => {
	const w = createWarehouse("Legacy", 20, 14);
	w.published = true;
	w.demoVersion = 2;
	for (const c of w.cells)
		c.type =
			c.x === 0 || c.x === 19 || c.y === 0 || c.y === 13 ? "wall" : "aisle";
	w.cells[20].type = "unload";
	w.cells[39].type = "load";
	w.cells[12 * 20 + 3].type = "charge";
	w.categories = [
		{ id: "c1", name: "Электроника", cold: false },
		{ id: "c2", name: "Продукты", cold: true },
		{ id: "c3", name: "Дом", cold: false },
	];
	for (const x of [3, 4])
		Object.assign(w.cells[3 * 20 + x], {
			type: "storage",
			zone: { id: "z", name: "Электроника", categoryId: "c1" },
		});
	w.products = [
		{
			id: "p1",
			name: "TV",
			sku: "EL-0042",
			category: "c1",
			volume: "0.5",
			price: "1",
			shelf: 0,
		},
	];
	w.stock = [
		{
			id: "legacy-stock",
			product: "p1",
			quantity: 64,
			reserved: 0,
			expires: "",
			cell: "3,3",
		},
	];
	w.robots = [
		{
			id: "r",
			name: "r",
			x: 1,
			y: 1,
			roles: ["ship", "sort", "unload"],
			capacity: "10",
			speed: 1,
			duration: 1,
			status: "idle",
		},
	];
	enrichDemo(w, clock());
	expect(w.width).toBe(36);
	expect(w.height).toBe(24);
	expect(
		w.stock
			.filter((s) => s.product === "p1")
			.reduce((n, s) => n + s.quantity, 0),
	).toBe(64);
	expect(warehouseSchema.safeParse(w).success).toBe(true);
	const migrated = structuredClone(w);
	enrichDemo(w, clock());
	expect(w).toEqual(migrated);
});

test("resize invalidates configured paths to relocated docks", () => {
	const w = seed(clock()).warehouses[0];
	for (const o of w.orders) cancelOrder(w, o);
	const shelf = w.cells.find((c) => c.type === "storage")!;
	const routes = defaultBlockRoutes(w.cells, [shelf]);
	w.routePlans = [{ id: "s", keys: [`${shelf.x},${shelf.y}`], ...routes }];
	const store = new DemoWarehouseStore(() => ({ warehouses: [w] }));
	const commands = new WarehouseCommandService(store, commandHandlers, clock());
	const resized = commands.execute("demo-warehouse-1", {
		action: "resize",
		value: { width: 40, height: 26 },
	});
	expect(resized.routePlans).toEqual([]);
	expect(resized.version).toBe(w.version + 1);
});
test("editing an assigned robot cannot discard its current task", () => {
	const w = seed(clock()).warehouses[0];
	w.running = true;
	stepWarehouse(w, clock());
	const busy = w.robots.find((r) => r.currentTask)!;
	const store = new DemoWarehouseStore(() => ({ warehouses: [w] }));
	const saved = store.listWarehouses()[0],
		robot = saved.robots.find((r) => r.currentTask)!;
	const commands = new WarehouseCommandService(store, commandHandlers, clock());
	expect(() =>
		commands.execute(saved.id, {
			action: "robot",
			value: { ...robot, name: "Renamed" },
		}),
	).toThrow("Дождитесь завершения");
	expect(
		store.getWarehouse(saved.id)?.robots.find((r) => r.id === robot.id)
			?.currentTask,
	).toEqual(robot.currentTask);
	expect(busy).toBeDefined();
});
