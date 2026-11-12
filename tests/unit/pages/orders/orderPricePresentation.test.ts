import { expect, test } from "bun:test";
import { getOrderPresentation } from "@/pages/orders/model/getOrderPresentation";
import { requiredAt } from "@/shared/lib/requiredAt";

import { reportWarehouse as base } from "../../../support/reportWarehouse";

test("order detail marks only products whose catalogue price is missing, preserving their category", () => {
	const product = requiredAt(base.products, 0);
	const order = requiredAt(base.orders, 0);
	const presentation = getOrderPresentation(
		{
			...order,
			lines: [
				{ product: "unknown", quantity: 2, expires: "" },
				{ product: "free", quantity: 3, expires: "" },
				{ product: "priced", quantity: 4, expires: "" },
			],
		},
		{
			products: [
				{ ...product, id: "unknown", category: "a", price: "" },
				{ ...product, id: "free", category: "a", price: "0" },
				{ ...product, id: "priced", category: "b", price: "2,50" },
			],
		},
	);
	expect(
		presentation.lines
			.filter((line) => line.unpriced)
			.map((line) => ({ product: line.product, category: line.category })),
	).toEqual([{ product: "unknown", category: "a" }]);
});
