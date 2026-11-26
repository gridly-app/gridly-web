import { expect, test } from "bun:test";

import type { Order } from "@/domain/warehouse";

import { warehouse } from "../../../../../tests/support/warehouse";

import { activeFilterCount, filterOrders } from "./orderFilters";

function order(id: string, overrides: Partial<Order>): Order {
	return {
		id,
		number: id,
		kind: "inbound",
		party: "Поставщик",
		status: "draft",
		created: "2026-11-12T00:00:00Z",
		lines: [],
		manual: warehouse().policy,
		...overrides,
	};
}

const orders = [
	order("IN-1", { party: "Альфа" }),
	order("OUT-1", { kind: "outbound", status: "completed", party: "Бета" }),
];

test("orders match kind, status and search text together", () => {
	expect(
		filterOrders(orders, { search: "", kind: "outbound", status: "all" }).map(
			({ id }) => id,
		),
	).toEqual(["OUT-1"]);
	expect(
		filterOrders(orders, { search: "альфа", kind: "all", status: "all" }).map(
			({ id }) => id,
		),
	).toEqual(["IN-1"]);
	expect(
		filterOrders(orders, { search: "", kind: "inbound", status: "completed" }),
	).toEqual([]);
});

test("the active filter count ignores search text", () => {
	expect(
		activeFilterCount({ search: "IN", kind: "outbound", status: "completed" }),
	).toBe(2);
	expect(activeFilterCount({ search: "IN", kind: "all", status: "all" })).toBe(
		0,
	);
});
