import { expect, test } from "bun:test";

import { isRefusedCreation } from "./creationRefusal";

test("deterministic server refusals end a creation attempt", () => {
	for (const status of [400, 401, 403, 404, 409, 412, 413, 422]) {
		expect(isRefusedCreation({ status, code: "ANY" })).toBe(true);
	}

	expect(
		isRefusedCreation({ status: 410, code: "STALE_DOCUMENT_VERSION" }),
	).toBe(true);
});

test("lost responses and server failures leave the outcome unknown", () => {
	expect(isRefusedCreation(new TypeError("Failed to fetch"))).toBe(false);
	expect(isRefusedCreation({ status: 500 })).toBe(false);
	expect(isRefusedCreation({ status: 503, code: "UNAVAILABLE" })).toBe(false);
	expect(
		isRefusedCreation({ status: 410, code: "IDEMPOTENCY_SECRET_EXPIRED" }),
	).toBe(false);
});
