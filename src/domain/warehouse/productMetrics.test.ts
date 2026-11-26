import { expect, test } from "bun:test";
import type { Order, Product } from ".";
import { orderValue, productPrice } from "./productMetrics";

const order: Order = {
	id: "o",
	number: "O",
	kind: "outbound",
	party: "Получатель",
	status: "draft",
	created: "2026-11-19T00:00:00Z",
	lines: [],
	manual: {
		confirmUnload: false,
		confirmLoad: false,
		confirmPick: false,
		confirmPutaway: false,
	},
};

test("a genuinely empty order is distinct from missing response data", () => {
	expect(orderValue(order, [])).toEqual({
		value: 0,
		unknown: 0,
		label: "Нет позиций",
	});
});

test("zero price is known while a missing price keeps the total incomplete", () => {
	const product: Product = {
		id: "zero",
		name: "Товар",
		sku: "SKU",
		category: "c",
		volume: "1",
		price: "0",
		shelf: 0,
	};
	const products = [
		product,
		{ ...product, id: "missing", price: "" },
		{ ...product, id: "priced", price: "10" },
	];
	const result = orderValue(
		{
			...order,
			lines: products.map((item) => ({
				product: item.id,
				quantity: 2,
				expires: "",
			})),
		},
		products,
	);

	expect(productPrice("0")).toBe(0);
	expect(productPrice("")).toBeNull();
	expect(result.value).toBe(20);
	expect(result.unknown).toBe(2);
	expect(result.label).toStartWith("от ");
});

test.each([
	{ input: "2,50", price: 2.5 },
	{ input: " 0 ", price: 0 },
	{ input: "  ", price: null },
	{ input: "-12", price: null },
	{ input: "Infinity", price: null },
	{ input: "12,2,1", price: null },
])("reads catalogue price $input as $price", ({ input, price }) => {
	expect(productPrice(input)).toBe(price);
});
