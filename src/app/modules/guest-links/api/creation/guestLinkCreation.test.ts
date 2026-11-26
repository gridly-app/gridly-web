import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import { ApiError, type HttpClient } from "@/shared/http";

import { mountDom } from "../../../../../../tests/support/dom";
import { createGuestLinkCreation } from "./guestLinkCreation";

const input = {
	name: "Ссылка для заказчика",
	expires_at: "2099-01-15T10:00:00Z",
	order_ids: ["order-1"],
	sections: [],
};

const issuedLink = {
	...input,
	id: "link-1",
	revision: 1,
	status: "active",
	url: "https://example.test/shipments",
};

function setup(
	request: HttpClient["request"],
	storageKey: string | null = null,
) {
	const client = new QueryClient();
	const http = { request };
	const path = "/admin/warehouses/warehouse-1/shipment-links";
	const scopeId = "account-1";
	const listKey = adminQueryKey(scopeId, path);
	const { store, creation, recovery } = createGuestLinkCreation(client, http, {
		scopeId,
		path,
		storageKey,
		canRetry: true,
	});

	return { client, listKey, attempt: store, creation, recovery };
}

test("retries an unconfirmed issue with the original key and updates the list after success", async () => {
	const keys: (string | undefined)[] = [];
	const { client, listKey, attempt, creation } = setup(
		async (_path, options) => {
			keys.push(options?.idempotencyKey);

			if (keys.length === 1) throw new TypeError("Connection lost");

			return issuedLink;
		},
	);

	expect(await creation.start(input)).toBe(false);
	expect(await creation.start(input)).toBe(false);
	expect(attempt.read()?.status).toBe("unknown");
	expect(await creation.retry()).toBe(true);
	expect(keys).toEqual([expect.any(String), keys[0]]);
	expect(client.getQueryData(listKey)).toEqual({
		items: [expect.objectContaining({ id: issuedLink.id })],
	});
	expect(
		client.getQueryData<{ items: object[] }>(listKey)?.items[0],
	).not.toHaveProperty("url");
	expect(attempt.read()).toEqual({
		status: "issued",
		link: { id: "link-1", url: "https://example.test/shipments" },
	});
});

test("a refreshed list cannot resolve an unknown issue or allow another creation", async () => {
	let canRead = false;
	const { attempt, creation, recovery } = setup(async (_path, options) => {
		if (options?.method === "POST") throw new TypeError("Connection lost");
		if (!canRead) throw new ApiError("Service unavailable", 503);

		return { items: [issuedLink] };
	});

	await creation.start(input);
	await recovery.refreshList();

	expect(attempt.read()).toMatchObject({
		status: "unknown",
	});

	canRead = true;

	await recovery.refreshList();

	expect(attempt.read()).toMatchObject({
		status: "unknown",
	});

	expect(attempt.read()?.status).toBe("unknown");
	expect(await creation.start({ ...input, name: "Другая ссылка" })).toBe(false);
});

test("an expired secret identifies the one link to revoke before issuing again", async () => {
	let sends = 0;
	const { attempt, creation } = setup(async (_path, options) => {
		if (options?.method !== "POST") return { items: [] };

		sends++;
		if (sends === 1) throw new TypeError("Connection lost");

		throw new ApiError("Secret expired", 410, "IDEMPOTENCY_SECRET_EXPIRED", {
			link_id: "link-from-receipt",
			status: "active",
		});
	});

	await creation.start(input);
	await creation.retry();

	expect(attempt.read()).toMatchObject({
		status: "unknown",
		resolution: { status: "secret-expired", linkId: "link-from-receipt" },
	});
	expect(await creation.retry()).toBe(false);
	expect(await creation.start(input)).toBe(false);
	expect(sends).toBe(2);

	attempt.forgetIssuedLink("another-link");
	expect(attempt.read()?.status).toBe("unknown");

	attempt.forgetIssuedLink("link-from-receipt");
	expect(attempt.read()).toBeNull();
});

test("a reload restores the original issue key without exposing its URL in storage", async () => {
	const dom = mountDom();
	const keys: (string | undefined)[] = [];
	const request: HttpClient["request"] = async (_path, options) => {
		keys.push(options?.idempotencyKey);

		if (keys.length === 1) throw new TypeError("Connection lost");

		return issuedLink;
	};
	const first = setup(request, "first-account:warehouse-1");
	const restored = setup(request, "first-account:warehouse-1");
	const otherAccount = setup(request, "second-account:warehouse-1");
	const otherWarehouse = setup(request, "first-account:warehouse-2");

	try {
		expect(await first.creation.start(input)).toBe(false);

		restored.attempt.restore();
		otherAccount.attempt.restore();
		otherWarehouse.attempt.restore();

		expect(restored.attempt.read()).toMatchObject({
			status: "unknown",
			key: keys[0],
		});
		expect(otherAccount.attempt.read()).toBeUndefined();
		expect(otherWarehouse.attempt.read()).toBeUndefined();
		expect(sessionStorage.getItem("first-account:warehouse-1")).not.toContain(
			issuedLink.url,
		);
		expect(await restored.creation.start(input)).toBe(false);
		expect(await restored.creation.retry()).toBe(true);
		expect(keys).toEqual([expect.any(String), keys[0]]);
		expect(sessionStorage.getItem("first-account:warehouse-1")).toBeNull();
	} finally {
		for (const fixture of [first, restored, otherAccount, otherWarehouse])
			fixture.client.clear();

		await dom.close();
	}
});

test("a damaged recovery record blocks a new issue and preserves the record", async () => {
	const dom = mountDom();
	const key = "damaged-attempt";
	const writes: unknown[] = [];
	const { client, attempt, creation } = setup(async (_path, options) => {
		writes.push(options);

		return issuedLink;
	}, key);

	try {
		sessionStorage.setItem(key, "{damaged");

		attempt.restore();

		expect(await creation.start(input)).toBe(false);
		expect(await creation.retry()).toBe(false);
		expect(writes).toEqual([]);
		expect(sessionStorage.getItem(key)).toBe("{damaged");
	} finally {
		client.clear();
		await dom.close();
	}
});
