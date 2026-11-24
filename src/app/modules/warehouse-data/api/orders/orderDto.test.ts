import { expect, test } from "bun:test";
import { orderDto } from "./orderDto";

const order = {
	id: "order",
	number: "O-1",
	kind: "outbound",
	counterparty_text: "Получатель",
	status: "draft",
	created_at: "2026-11-19T00:00:00Z",
	allowed_actions: [],
	lines: [],
};

test("an empty order remains valid but a partial list response is rejected", () => {
	expect(orderDto.parse(order).lines).toEqual([]);

	for (const field of ["lines", "number", "allowed_actions"]) {
		const partial: Record<string, unknown> = { ...order };

		delete partial[field];

		expect(orderDto.safeParse(partial).success).toBe(false);
	}
});
