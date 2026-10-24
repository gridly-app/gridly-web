import { expect, test } from "bun:test";
import { seed } from "../src/app/demo/fixtures/seed";
import { DemoWarehouseStore } from "../src/app/demo/runtime/DemoWarehouseStore";
import { assignRobotTask } from "../src/app/demo/services/assignRobotTask";
import { DemoTicker } from "../src/app/demo/services/DemoTicker";
import { stepWarehouse } from "../src/app/demo/simulation/stepWarehouse";
import {
	applyTaskPlan,
	createPlanningContext,
	planTask,
} from "../src/app/demo/simulation/taskPlanner";
import {
	cancelOrder,
	commitTaskDelivery,
	completeOrder,
	createWarehouse,
	type Order,
	occupiedStorageVolume,
	type Robot,
	startOrder,
	validateMap,
	type Warehouse,
	warehouseSchema,
} from "../src/entities/warehouse";

function robot(id: string, x = 1, y = 1): Robot {
	return {
		id,
		name: id,
		x,
		y,
		roles: ["ship", "unload", "sort"],
		capacity: "10",
		speed: 1,
		duration: 1,
		status: "idle",
	};
}
function order(id: string, kind: Order["kind"], quantity: number): Order {
	return {
		id,
		number: id,
		kind,
		party: "Audit",
		status: "draft",
		lines: [{ product: "p", quantity, expires: "" }],
		manual: [false, false, false, false],
		stage: 0,
		created: "2026-10-24T00:00:00Z",
	};
}
function warehouse(): Warehouse {
	const w = createWarehouse("Audit", 7, 5);
	w.published = true;
	w.cells.forEach((c) => {
		c.type = "aisle";
	});
	w.cells.find((c) => c.x === 0 && c.y === 1)!.type = "unload";
	w.cells.find((c) => c.x === 6 && c.y === 1)!.type = "load";
	for (const x of [2, 4])
		Object.assign(w.cells.find((c) => c.x === x && c.y === 2)!, {
			type: "storage",
			capacity: 4,
			zone: { id: "z", name: "z", categoryId: "c" },
		});
	w.categories = [{ id: "c", name: "c", cold: false }];
	w.products = [
		{
			id: "p",
			name: "p",
			sku: "p",
			category: "c",
			volume: "1",
			price: "1",
			shelf: 0,
		},
	];
	w.robots = [robot("r1"), robot("r2", 5, 1)];
	return w;
}

test("outbound orders pick their own reserved batches", () => {
	const w = warehouse();
	w.stock = [2, 4].map((x, i) => ({
		id: `s${i}`,
		product: "p",
		quantity: 1,
		reserved: 0,
		expires: "",
		cell: `${x},2`,
	}));
	w.orders = [order("o1", "outbound", 1), order("o2", "outbound", 1)];
	w.orders.forEach((o) => startOrder(w, o));
	w.orders.forEach((o, i) =>
		expect(assignRobotTask(w, o, w.robots[i])).toBe(true),
	);
	expect(w.robots.map((r) => r.currentTask?.shelfKey)).toEqual(["2,2", "4,2"]);
});
test("inbound tasks split cargo across available shelves without overbooking", () => {
	const w = warehouse();
	const o = order("o", "inbound", 8);
	w.orders = [o];
	startOrder(w, o);
	expect(assignRobotTask(w, o, w.robots[0])).toBe(true);
	expect(w.robots[0].currentTask?.quantity).toBe(4);
	expect(assignRobotTask(w, o, w.robots[1])).toBe(true);
	expect(w.robots[1].currentTask?.quantity).toBe(4);
	expect(w.robots.map((r) => r.currentTask?.shelfKey)).toEqual(["2,2", "4,2"]);
	expect(o.status).toBe("running");
});
test("scheduler tries the second capable robot", () => {
	const w = warehouse();
	w.robots[0].capacity = "0.5";
	w.orders = [order("o", "inbound", 1)];
	startOrder(w, w.orders[0]);
	const store = new DemoWarehouseStore(() => ({ warehouses: [w] }));
	const saved = store.listWarehouses()[0];
	saved.running = true;
	store.saveWarehouse(saved);
	new DemoTicker(store).advance();
	expect(store.listWarehouses()[0].robots[1].currentTask).toBeDefined();
});
test("inaccessible shelf waits for recovery without losing reservation or cargo", () => {
	const w = warehouse();
	w.stock = [
		{
			id: "s",
			product: "p",
			quantity: 1,
			reserved: 0,
			expires: "",
			cell: "2,2",
		},
	];
	const o = order("o", "outbound", 1);
	w.orders = [o];
	startOrder(w, o);
	const neighbors = w.cells.filter(
		(c) => Math.abs(c.x - 2) + Math.abs(c.y - 2) === 1,
	);
	neighbors.forEach((c) => (c.type = "wall"));
	expect(assignRobotTask(w, o, w.robots[0])).toBe(false);
	expect(o.status).toBe("running");
	expect(w.stock[0].reserved).toBe(1);
	neighbors.forEach((c) => (c.type = "aisle"));
	expect(assignRobotTask(w, o, w.robots[0])).toBe(true);
});
test("all fresh warehouses respect shelf capacity", () => {
	for (const w of seed().warehouses)
		for (const c of w.cells) {
			const volume = w.stock
				.filter((s) => s.cell === `${c.x},${c.y}`)
				.reduce(
					(n, s) =>
						n +
						s.quantity *
							Number(w.products.find((p) => p.id === s.product)?.volume),
					0,
				);
			expect(volume).toBeLessThanOrEqual(c.capacity + 1e-8);
		}
});

function clock() {
	let counter = 0;
	return {
		now: () => new Date("2026-10-24T22:30:00Z"),
		nextId: () => `test-${++counter}`,
	};
}
function run(w: Warehouse, count = 150) {
	w.running = true;
	const context = clock();
	for (let i = 0; i < count; i++) stepWarehouse(w, context);
}
function shippedFixture() {
	const w = warehouse();
	w.robots = [robot("r")];
	w.stock = [
		{
			id: "s",
			product: "p",
			quantity: 4,
			reserved: 0,
			expires: "",
			cell: "2,2",
		},
	];
	return w;
}
test("full split putaway and outbound cycles conserve quantities and complete once", () => {
	const w = warehouse();
	w.robots = [robot("r")];
	const incoming = order("in", "inbound", 8);
	w.orders = [incoming];
	startOrder(w, incoming);
	run(w);
	expect(incoming.status).toBe("received");
	expect(w.stock.reduce((n, s) => n + s.quantity, 0)).toBe(8);
	expect(w.events).toHaveLength(1);
	const outgoing = order("out", "outbound", 8);
	w.orders.push(outgoing);
	startOrder(w, outgoing);
	run(w);
	expect(outgoing.status).toBe("shipped");
	expect(w.stock).toHaveLength(0);
	expect(w.events).toHaveLength(2);
});
test("FEFO and repeated product lines keep distinct batch ownership", () => {
	const w = shippedFixture();
	w.stock.push({
		...w.stock[0],
		id: "early",
		quantity: 2,
		cell: "4,2",
		expires: "2026-10-27",
	});
	const o = order("o", "outbound", 2);
	o.lines.push({ ...o.lines[0], quantity: 3 });
	w.orders = [o];
	startOrder(w, o, "2026-10-24");
	expect(
		o.allocations?.map((a) => [a.lineIndex, a.stockId, a.quantity]),
	).toEqual([
		[0, "early", 2],
		[1, "s", 3],
	]);
	run(w);
	expect(o.status).toBe("shipped");
	expect(o.processed).toEqual([2, 3]);
	expect(w.stock.map((s) => [s.id, s.quantity, s.reserved])).toEqual([
		["s", 1, 0],
	]);
});
test("delivery replay and repeated completion cannot post stock twice", () => {
	const w = shippedFixture();
	const o = order("o", "outbound", 2);
	w.orders = [o];
	startOrder(w, o);
	expect(assignRobotTask(w, o, w.robots[0])).toBe(true);
	const task = structuredClone(w.robots[0].currentTask!);
	expect(commitTaskDelivery(w, task)).toBe(true);
	expect(commitTaskDelivery(w, task)).toBe(false);
	delete w.robots[0].currentTask;
	completeOrder(w, o);
	completeOrder(w, o);
	expect(w.stock[0]).toMatchObject({ quantity: 2, reserved: 0 });
	expect(o.processed).toEqual([2]);
	expect(o.status).toBe("shipped");
});
test("waiting and running inbound orders reserve space atomically across lines", () => {
	const w = warehouse();
	const o = order("o", "inbound", 4);
	o.lines.push({ ...o.lines[0], quantity: 5 });
	w.orders = [o];
	expect(() => startOrder(w, o)).toThrow("Недостаточно места");
	expect(o.allocations).toBeUndefined();
	o.lines[1].quantity = 4;
	o.manual = [true];
	startOrder(w, o);
	const other = order("other", "inbound", 1);
	w.orders.push(other);
	expect(() => startOrder(w, other)).toThrow("Недостаточно места");
	cancelOrder(w, o);
	expect(() => startOrder(w, other)).not.toThrow();
});
test("partial outbound cancellation releases only undelivered reservations", () => {
	const w = shippedFixture();
	w.robots[0].capacity = "1";
	const o = order("o", "outbound", 3);
	w.orders = [o];
	startOrder(w, o);
	expect(assignRobotTask(w, o, w.robots[0])).toBe(true);
	commitTaskDelivery(w, w.robots[0].currentTask!);
	delete w.robots[0].currentTask;
	cancelOrder(w, o);
	expect(w.stock[0]).toMatchObject({ quantity: 3, reserved: 0 });
	expect(o.processed).toEqual([1]);
});
test("cancellation rejects carried cargo and preserves the task", () => {
	const w = shippedFixture();
	const o = order("o", "outbound", 2);
	w.orders = [o];
	startOrder(w, o);
	assignRobotTask(w, o, w.robots[0]);
	w.robots[0].currentTask!.carrying = true;
	expect(() => cancelOrder(w, o)).toThrow("Дождитесь доставки");
	expect(w.robots[0].currentTask).toBeDefined();
	expect(w.stock[0].reserved).toBe(2);
});
test("candidate rejection is read-only and a stale plan cannot overbook a reservation", () => {
	const w = warehouse();
	const o = order("o", "inbound", 1);
	w.orders = [o];
	startOrder(w, o);
	const before = structuredClone(w);
	const ctx = createPlanningContext(w, "2026-10-24");
	const first = planTask(ctx, o.id, w.robots[0].id),
		second = planTask(ctx, o.id, w.robots[1].id);
	expect(w).toEqual(before);
	expect(first.kind).toBe("planned");
	expect(second.kind).toBe("planned");
	if (first.kind !== "planned" || second.kind !== "planned")
		throw new Error("No plan");
	expect(applyTaskPlan(w, first, clock().nextId)).toBe(true);
	expect(applyTaskPlan(w, second, clock().nextId)).toBe(false);
});
test("scheduler tries another reachable shelf and dock", () => {
	const w = warehouse();
	w.robots = [robot("r", 5, 1)];
	w.cells
		.filter((c) => Math.abs(c.x) + Math.abs(c.y - 1) === 1)
		.forEach((c) => {
			c.type = "wall";
		});
	w.cells.find((c) => c.x === 6 && c.y === 3)!.type = "unload";
	w.cells
		.filter((c) => Math.abs(c.x - 2) + Math.abs(c.y - 2) === 1)
		.forEach((c) => {
			c.type = "wall";
		});
	const o = order("o", "inbound", 8);
	w.orders = [o];
	startOrder(w, o);
	expect(assignRobotTask(w, o, w.robots[0])).toBe(true);
	expect(w.robots[0].currentTask?.shelfKey).toBe("4,2");
	expect(w.robots[0].currentTask?.target).toMatchObject({ x: 6, y: 3 });
});
test("same fixture and context produce identical long simulations", () => {
	const a = seed(clock()),
		b = seed(clock());
	for (const fixture of [a, b]) {
		const context = clock();
		for (const w of fixture.warehouses) w.running = true;
		for (let i = 0; i < 80; i++)
			for (const w of fixture.warehouses) stepWarehouse(w, context);
	}
	expect(a).toEqual(b);
	for (const w of a.warehouses) {
		expect(
			w.orders.some((o) => o.status === "received" || o.status === "shipped"),
		).toBe(true);
		for (const [key, volume] of occupiedStorageVolume(w)) {
			expect(volume).toBeLessThanOrEqual(
				w.cells.find((c) => `${c.x},${c.y}` === key)!.capacity + 1e-7,
			);
		}
		expect(
			w.stock.every((s) => s.quantity >= s.reserved && s.reserved >= 0),
		).toBe(true);
	}
});
test("fresh fixtures validate references, zones, map and robot placement", () => {
	for (const w of seed(clock()).warehouses) {
		expect(validateMap(w.cells, w.width, w.height)).toEqual([]);
		expect(warehouseSchema.safeParse(w).success).toBe(true);
		expect(new Set(w.robots.map((r) => `${r.x},${r.y}`)).size).toBe(
			w.robots.length,
		);
		for (const r of w.robots)
			expect(
				w.cells.some(
					(c) =>
						c.x === r.x &&
						c.y === r.y &&
						["aisle", "load", "unload", "charge"].includes(c.type),
				),
			).toBe(true);
		for (const s of w.stock) {
			const p = w.products.find((p) => p.id === s.product)!;
			expect(w.categories.some((c) => c.id === p.category)).toBe(true);
			expect(
				w.cells.find((c) => `${c.x},${c.y}` === s.cell)?.zone?.categoryId,
			).toBe(p.category);
		}
		for (const o of w.orders)
			for (const a of o.allocations || [])
				if (a.stockId)
					expect(w.stock.some((s) => s.id === a.stockId)).toBe(true);
	}
});

test("a failed multi-line outbound start never leaks reserves", () => {
	const w = shippedFixture();
	const o = order("o", "outbound", 2);
	o.lines.push({ ...o.lines[0], quantity: 3 });
	w.orders = [o];
	expect(() => startOrder(w, o)).toThrow("Недостаточно товара");
	expect(w.stock[0].reserved).toBe(0);
	expect(o.allocations).toBeUndefined();
});
test("an auto order retries resource validation after stock becomes available", () => {
	const w = shippedFixture();
	w.stock = [];
	const o = order("o", "outbound", 1);
	o.demoAutoStart = true;
	w.orders = [o];
	w.running = true;
	stepWarehouse(w, clock());
	expect(o.status).toBe("blocked");
	expect(o.allocations).toBeUndefined();
	w.stock = [
		{
			id: "s",
			product: "p",
			quantity: 1,
			reserved: 0,
			expires: "",
			cell: "2,2",
		},
	];
	stepWarehouse(w, clock());
	expect(o.status).toBe("running");
	expect(w.robots[0].currentTask).toBeDefined();
});

test("no dock waits without leaking or releasing another order's allocation", () => {
	const w = shippedFixture();
	const a = order("a", "outbound", 1),
		b = order("b", "outbound", 1);
	w.orders = [a, b];
	startOrder(w, a);
	startOrder(w, b);
	const dock = w.cells.find((c) => c.type === "load")!;
	dock.type = "wall";
	expect(assignRobotTask(w, a, w.robots[0])).toBe(false);
	expect(a.status).toBe("running");
	cancelOrder(w, a);
	expect(w.stock[0].reserved).toBe(1);
	dock.type = "load";
	expect(assignRobotTask(w, b, w.robots[0])).toBe(true);
});
test("new planning contexts see geometry changes without stale graph caches", () => {
	const w = warehouse();
	const o = order("o", "inbound", 1);
	w.orders = [o];
	startOrder(w, o);
	expect(
		planTask(createPlanningContext(w, "2026-10-24"), o.id, w.robots[0].id).kind,
	).toBe("planned");
	const neighbors = w.cells.filter(
		(c) => Math.abs(c.x - 2) + Math.abs(c.y - 2) === 1,
	);
	for (const c of neighbors) c.type = "wall";
	expect(
		planTask(createPlanningContext(w, "2026-10-24"), o.id, w.robots[0].id).kind,
	).not.toBe("planned");
	for (const c of neighbors) c.type = "aisle";
	expect(
		planTask(createPlanningContext(w, "2026-10-24"), o.id, w.robots[0].id).kind,
	).toBe("planned");
});
