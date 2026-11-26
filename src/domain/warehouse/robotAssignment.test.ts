import { expect, test } from "bun:test";

import { robotAssignment } from "./robotAssignment";
import type { Robot } from "./robot";

test("a robot keeps the task and its order link when related data is absent", () => {
	const cell = { x: 1, y: 2 };
	const robot: Robot = {
		id: "robot",
		name: "Robot",
		...cell,
		status: "carrying",
		speed: 1,
		duration: 1,
		capacity: "3",
		roles: [],
		currentTask: {
			orderId: "order-1",
			productId: "product-1",
			lineIndex: 0,
			quantity: 3,
			phase: "delivery",
			label: "Серверная задача",
			destination: cell,
			target: cell,
			route: [cell],
			actionTicks: 1,
			carrying: true,
		},
	};

	expect(robotAssignment(robot, { orders: [], products: [] })).toEqual({
		title: "Серверная задача",
		order: { id: "order-1", kind: undefined, number: "order-1" },
		detail: "product-1 · 3 шт.",
	});
});
