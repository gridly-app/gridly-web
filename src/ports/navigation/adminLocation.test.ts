import { expect, test } from "bun:test";

import { adminLocation, readAdminLocation } from "./adminLocation";

test("an unknown tab falls back to the audit and retains the linked order card", () => {
	const params = new URLSearchParams(
		"tab=typo&warehouse_id=north&order=card-1",
	);

	expect(readAdminLocation(params)).toEqual({
		section: { tab: "audit" },
		orderCard: { warehouseId: "north", orderId: "card-1" },
	});
});

test("a diagnostics link preserves both the diagnostic order and the order card", () => {
	const search = adminLocation("system", {
		warehouse_id: "north",
		order_id: "order-1",
		order: "order-2",
	});
	const params = new URLSearchParams(search);

	expect(readAdminLocation(params)).toEqual({
		section: {
			tab: "system",
			orderScope: { warehouseId: "north", orderId: "order-1" },
		},
		orderCard: { warehouseId: "north", orderId: "order-2" },
	});
});
