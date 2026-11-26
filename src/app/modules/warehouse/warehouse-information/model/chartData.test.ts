import { expect, test } from "bun:test";
import type { Order } from "@/domain/warehouse";

import { trafficBuckets } from "./chartData";
import type { ReportFilters } from "./report";

test("weekly chart includes both warehouse date boundaries and counts orders or units", () => {
	const filters: ReportFilters = {
		from: "2026-11-01",
		to: "2026-11-08",
		category: "all",
		status: "all",
		kind: "all",
		compare: false,
	};
	const order: Order = {
		id: "first",
		kind: "inbound",
		status: "received",
		number: "IN-1",
		party: "Supplier",
		created: "2026-10-31T21:00:00Z",
		manual: {
			confirmUnload: false,
			confirmPick: false,
			confirmPutaway: false,
			confirmLoad: false,
		},
		lines: [{ product: "p", quantity: 7, expires: "" }],
	};
	const orders = [
		order,
		{
			...order,
			id: "last",
			kind: "outbound" as const,
			created: "2026-11-08T20:59:59Z",
			lines: [{ product: "p", quantity: 3, expires: "" }],
		},
	];

	expect(
		trafficBuckets(orders, filters, "quantity", "week", "Europe/Moscow"),
	).toEqual([
		{ from: "2026-11-01", to: "2026-11-07", inbound: 7, outbound: 0 },
		{ from: "2026-11-08", to: "2026-11-08", inbound: 0, outbound: 3 },
	]);
	expect(
		trafficBuckets(orders, filters, "orders", "week", "Europe/Moscow"),
	).toMatchObject([
		{ inbound: 1, outbound: 0 },
		{ inbound: 0, outbound: 1 },
	]);
});
