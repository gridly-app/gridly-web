import { expect, test } from "bun:test";

import type { Warehouse } from "@/domain/warehouse";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { liveRefreshes, nextLiveSnapshot } from "./livePatch";
import type { StatePatch } from "./statePatch";

function current(): Warehouse {
	return { ...warehouse(), version: 3, stateVersion: "10", tick: "10" };
}

function patch(overrides: Partial<StatePatch> = {}): StatePatch {
	return {
		warehouse_id: "w",
		tick: "11",
		state_version: "11",
		committed_at: "2026-11-26T10:00:00Z",
		robots: null,
		tasks: null,
		stock_changes: null,
		order_changes: null,
		...overrides,
	};
}

const context = { warehouseId: "w", layoutVersion: 3, eventId: "11" };

test("the next state version is applied", () => {
	const next = nextLiveSnapshot(current(), patch(), context);

	expect(next?.stateVersion).toBe("11");
	expect(next?.tick).toBe("11");
});

test("an already applied state version is skipped", () => {
	expect(
		nextLiveSnapshot(current(), patch({ state_version: "10" }), {
			...context,
			eventId: "10",
		}),
	).toBeNull();
});

test("a gap in state versions requires a resync", () => {
	expect(() =>
		nextLiveSnapshot(current(), patch({ state_version: "12" }), {
			...context,
			eventId: "12",
		}),
	).toThrow("Пропущено событие состояния");
});

test("an event id that does not match the state version requires a resync", () => {
	expect(() =>
		nextLiveSnapshot(current(), patch(), { ...context, eventId: "9" }),
	).toThrow("Пропущено событие состояния");
	expect(
		nextLiveSnapshot(current(), patch(), { ...context, eventId: "" }),
	).not.toBeNull();
});

test("a patch for another warehouse or layout is rejected", () => {
	expect(() =>
		nextLiveSnapshot(current(), patch({ warehouse_id: "other" }), context),
	).toThrow("Событие другого склада");
	expect(() =>
		nextLiveSnapshot(current(), patch({ layout_version: 4 }), context),
	).toThrow("Карта изменилась");
	expect(() =>
		nextLiveSnapshot(current(), patch(), { ...context, layoutVersion: 2 }),
	).toThrow("Карта изменилась");
	expect(() => nextLiveSnapshot(undefined, patch(), context)).toThrow(
		"Карта изменилась",
	);
});

test("a tick older than the current one is rejected", () => {
	expect(() =>
		nextLiveSnapshot(current(), patch({ tick: "9" }), context),
	).toThrow("Устаревший тик состояния");
});

test("refreshes follow the parts of the warehouse the patch changed", () => {
	const task = { task_id: "t", status: "done", phase: "delivery" };
	const stock = {
		batch_id: "b",
		quantity: 1,
		reserved_quantity: 0,
	};
	const order = { order_id: "o", status: "completed" };

	expect(liveRefreshes(patch())).toEqual([]);
	expect(liveRefreshes(patch({ tasks: [task] }))).toEqual([
		"robots",
		"orders",
		"history",
		"order-details",
	]);
	expect(liveRefreshes(patch({ stock_changes: [stock] }))).toEqual([
		"inventory",
		"history",
	]);
	expect(liveRefreshes(patch({ order_changes: [order] }))).toEqual([
		"orders",
		"history",
		"order-details",
	]);
});
