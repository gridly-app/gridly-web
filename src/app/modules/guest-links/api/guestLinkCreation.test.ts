import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import { ApiError, type HttpClient } from "@/shared/http";

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

function setup(request: HttpClient["request"]) {
	const client = new QueryClient();
	const http = { request };
	const path = "/admin/warehouses/warehouse-1/shipment-links";
	const scopeId = "account-1";
	const listKey = adminQueryKey(scopeId, path);
	const { store, creation, recovery } = createGuestLinkCreation(client, http, {
		scopeId,
		path,
		storageKey: null,
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
	expect(client.getQueryData(listKey)).toEqual({ items: [issuedLink] });
	expect(attempt.read()).toEqual({
		status: "issued",
		link: { id: "link-1", url: "https://example.test/shipments" },
	});
});

test("keeps the issue unresolved until the user acknowledges a successful list refresh", async () => {
	let canRead = false;
	const { attempt, creation, recovery } = setup(async (_path, options) => {
		if (options?.method === "POST") throw new TypeError("Connection lost");
		if (!canRead) throw new ApiError("Service unavailable", 503);

		return { items: [issuedLink] };
	});

	await creation.start(input);
	await recovery.refreshList();
	recovery.acknowledge();

	expect(attempt.read()).toMatchObject({
		status: "unknown",
		hasRefreshedList: false,
	});

	canRead = true;

	await recovery.refreshList();

	expect(attempt.read()).toMatchObject({
		status: "unknown",
		hasRefreshedList: true,
	});

	recovery.acknowledge();

	expect(attempt.read()).toBeNull();
});
