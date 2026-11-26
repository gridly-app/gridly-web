import { expect, test } from "bun:test";

import type { Order, Product } from "@/domain/warehouse";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { type OrderFilters, filterOrders } from "./orderFilters";

const policy = warehouse().policy;

function product(id: string, category: string, price: string): Product {
	return { id, name: id, sku: id, category, volume: "1", price, shelf: 0 };
}

function order(
	id: string,
	created: string,
	lines: Order["lines"],
	overrides: Partial<Order> = {},
): Order {
	return {
		id,
		number: id,
		kind: "inbound",
		party: "Поставщик",
		status: "draft",
		created,
		lines,
		manual: policy,
		...overrides,
	};
}

function line(product: string, quantity = 1): Order["lines"][number] {
	return { product, quantity, expires: "" };
}

const products = [
	product("coffee", "drinks", "120"),
	product("tea", "drinks", ""),
	product("rice", "grocery", ""),
];

const allOrders: OrderFilters = {
	kind: "inbound",
	status: "all",
	category: "all",
	unpriced: false,
	from: "",
	to: "",
	search: "",
};

function ids(
	orders: Order[],
	filters: Partial<OrderFilters>,
	timeZone = "UTC",
) {
	return filterOrders(orders, products, timeZone, {
		...allOrders,
		...filters,
	}).map(({ id }) => id);
}

test("an order is counted on its calendar day in the warehouse time zone", () => {
	const lateEvening = order("IN-1", "2026-11-01T21:30:00Z", [line("coffee")]);

	expect(ids([lateEvening], { from: "2026-11-02" }, "Europe/Moscow")).toEqual([
		"IN-1",
	]);
	expect(ids([lateEvening], { from: "2026-11-02" }, "UTC")).toEqual([]);
	expect(ids([lateEvening], { to: "2026-11-01" }, "UTC")).toEqual(["IN-1"]);
});

test("a period filter drops orders with an unreadable creation date", () => {
	const broken = order("IN-1", "not a date", [line("coffee")]);

	expect(ids([broken], {})).toEqual(["IN-1"]);
	expect(ids([broken], { from: "2026-11-01" })).toEqual([]);
});

test("unpriced orders need an unpriced line with a positive quantity in the category", () => {
	const orders = [
		order("priced", "2026-11-01T10:00:00Z", [line("coffee")]),
		order("unpriced-tea", "2026-11-01T10:00:00Z", [line("tea")]),
		order("zero-tea", "2026-11-01T10:00:00Z", [line("tea", 0)]),
		order("unpriced-rice", "2026-11-01T10:00:00Z", [
			line("coffee"),
			line("rice"),
		]),
	];

	expect(ids(orders, { unpriced: true })).toEqual([
		"unpriced-tea",
		"unpriced-rice",
	]);
	expect(ids(orders, { unpriced: true, category: "drinks" })).toEqual([
		"unpriced-tea",
	]);
});

test("kind, status, category and search narrow the list together", () => {
	const orders = [
		order("IN-1", "2026-11-01T10:00:00Z", [line("coffee")], {
			status: "active",
		}),
		order("IN-2", "2026-11-01T10:00:00Z", [line("rice")], { status: "active" }),
		order("OUT-1", "2026-11-01T10:00:00Z", [line("coffee")], {
			kind: "outbound",
			status: "active",
		}),
		order("IN-3", "2026-11-01T10:00:00Z", [line("coffee")], {
			party: "Чайный дом",
		}),
	];

	expect(ids(orders, { status: "active" })).toEqual(["IN-1", "IN-2"]);
	expect(ids(orders, { category: "grocery" })).toEqual(["IN-2"]);
	expect(ids(orders, { search: "чайный" })).toEqual(["IN-3"]);
	expect(ids(orders, { kind: "outbound" })).toEqual(["OUT-1"]);
});

test("an order without lines is kept unless a category is chosen", () => {
	const empty = order("IN-1", "2026-11-01T10:00:00Z", []);

	expect(ids([empty], {})).toEqual(["IN-1"]);
	expect(ids([empty], { category: "drinks" })).toEqual([]);
});
