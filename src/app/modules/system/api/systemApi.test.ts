import { expect, test } from "bun:test";
import { systemQueryUrl } from "./systemApi";

test("warehouse days use its timezone and an exclusive next-day boundary", () => {
	const url = new URL(
		systemQueryUrl("/system", {
			orderScope: { warehouseId: "w", orderId: "o" },
			from: "2026-11-19",
			to: "2026-11-19",
			timeZone: "Europe/Moscow",
		}),
		"http://localhost",
	);

	expect(url.searchParams.get("from")).toBe("2026-11-18T21:00:00.000Z");
	expect(url.searchParams.get("to")).toBe("2026-11-19T21:00:00.000Z");
	expect(url.searchParams.get("warehouse_id")).toBe("w");
});

test("DST boundaries use calendar days rather than adding 24 hours", () => {
	const url = new URL(
		systemQueryUrl("/system", {
			orderScope: null,
			from: "2026-03-08",
			to: "2026-03-08",
			timeZone: "America/New_York",
		}),
		"http://localhost",
	);

	expect(url.searchParams.get("from")).toBe("2026-03-08T05:00:00.000Z");
	expect(url.searchParams.get("to")).toBe("2026-03-09T04:00:00.000Z");
});

test("a single boundary stays open on the other side", () => {
	const url = new URL(
		systemQueryUrl("/system", {
			orderScope: null,
			from: "",
			to: "2026-11-19",
			timeZone: "UTC",
		}),
		"http://localhost",
	);

	expect(url.searchParams.has("from")).toBe(false);
	expect(url.searchParams.get("to")).toBe("2026-11-20T00:00:00.000Z");
});
