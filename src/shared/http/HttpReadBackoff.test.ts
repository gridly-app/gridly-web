import { expect, jest, test } from "bun:test";

import { HttpReadBackoff } from "./HttpReadBackoff";

test("opens the deferred read at its deadline and leaves other paths available", async () => {
	jest.useFakeTimers();

	try {
		const reads: string[] = [];
		const backoff = new HttpReadBackoff();

		backoff.defer("/stock", 1000);
		const deferred = backoff.wait("/stock").then(() => reads.push("/stock"));
		await backoff.wait("/orders");
		reads.push("/orders");

		jest.advanceTimersByTime(999);
		await Promise.resolve();

		expect(reads).toEqual(["/orders"]);

		jest.advanceTimersByTime(1);
		await deferred;

		expect(reads).toEqual(["/orders", "/stock"]);
		expect(backoff.has("/stock")).toBe(false);
	} finally {
		jest.useRealTimers();
	}
});
