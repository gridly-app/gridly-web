import { expect, test } from "bun:test";

import { warehouse } from "../../../tests/support/warehouse";
import { incomingProduct, orderCompletion } from "./orderForecast";
import type { Order, Robot, Warehouse } from "./warehouse";

function inboundFixture() {
	const base = warehouse();
	const asOf = "2026-11-12T10:00:00Z";
	const from = { x: 0, y: 0 };
	const to = { x: 2, y: 0 };
	const order: Order = {
		id: "incoming",
		number: "IN-1",
		kind: "inbound",
		status: "in_progress",
		created: asOf,
		party: "Supplier",
		manual: base.policy,
		lines: [
			{ product: "p", quantity: 12, expires: "", putaway: 3, writtenOff: 1 },
		],
	};
	const robot: Robot = {
		id: "r",
		name: "Robot",
		roles: [],
		...from,
		speed: 1,
		duration: 1,
		capacity: "8",
		status: "carrying",
		currentTask: {
			orderId: order.id,
			productId: "p",
			lineIndex: 0,
			quantity: 8,
			phase: "delivery",
			label: "Поставка",
			destination: to,
			target: to,
			route: [from, to],
			actionTicks: 1,
			carrying: true,
		},
	};
	const snapshot: Warehouse = {
		...base,
		asOf,
		orders: [order],
		robots: [robot],
	};

	return { order, snapshot };
}

test("predicts delivery from the current route and excludes putaway and written-off units", () => {
	const { order, snapshot } = inboundFixture();
	const incoming = incomingProduct("p", snapshot, 1000);

	expect(orderCompletion(order, snapshot, 1000).at).toBe(
		Date.parse("2026-11-12T10:00:03Z"),
	);
	expect(incoming.quantity).toBe(8);
	expect(incoming.deliveries).toMatchObject([
		{ orderId: "incoming", quantity: 8 },
	]);
});

test("does not forecast a delivery that requires manual confirmation", () => {
	const { order, snapshot } = inboundFixture();

	expect(
		orderCompletion(
			{ ...order, manual: { ...order.manual, confirmUnload: true } },
			snapshot,
			1000,
		),
	).toEqual({
		at: null,
		note: "Требуется ручное подтверждение",
	});
});

test("does not forecast when robots lack routes for the remaining batches", () => {
	const { order, snapshot } = inboundFixture();
	const moreUnits = {
		...order,
		lines: [{ product: "p", quantity: 20, expires: "" }],
	};

	expect(orderCompletion(moreUnits, snapshot, 1000)).toEqual({
		at: null,
		note: "Нужны маршруты следующих партий",
	});
});
