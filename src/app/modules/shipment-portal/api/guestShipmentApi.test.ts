import { expect, test } from "bun:test";

import { FetchHttpClient } from "@/shared/http";

import { shipment } from "../../../../../tests/support/shipment";

import { GuestShipmentApi } from "./guestShipmentApi";

test("guest reads validate the response and exclude account credentials", async () => {
	const requests: { url: string; options: RequestInit | undefined }[] = [];
	const http = new FetchHttpClient(
		"/api/v1",
		async (url, options) => {
			requests.push({ url: String(url), options });

			return Response.json({
				orders: [{ ...shipment(), id: "guest-1", sections: ["calendar"] }],
			});
		},
		{ refresh: false },
	);
	const api = new GuestShipmentApi(http);
	const controller = new AbortController();
	const read = api.read;

	const result = await read("guest-token", controller.signal);

	expect(result.orders[0]?.id).toBe("guest-1");
	expect(requests[0]?.url).toBe("/api/v1/public/shipments");
	expect(requests[0]?.options).toMatchObject({
		credentials: "omit",
		redirect: "error",
		cache: "no-store",
		referrerPolicy: "no-referrer",
	});
	expect(new Headers(requests[0]?.options?.headers).get("Authorization")).toBe(
		"Bearer guest-token",
	);

	controller.abort();

	expect(requests[0]?.options?.signal?.aborted).toBe(true);
});

test("guest reads reject an invalid shipment response", async () => {
	const api = new GuestShipmentApi(
		new FetchHttpClient(
			"/api/v1",
			async () => Response.json({ orders: [{ id: "missing-order" }] }),
			{ refresh: false },
		),
	);

	await expect(
		api.read("guest-token", new AbortController().signal),
	).rejects.toMatchObject({ status: 502, code: "INVALID_RESPONSE" });
});

test("guest document downloads encode the document id and use private response handling", async () => {
	const urls: string[] = [];
	const options: RequestInit[] = [];
	const api = new GuestShipmentApi(
		new FetchHttpClient(
			"/api/v1",
			async (url, init) => {
				urls.push(String(url));

				if (init) options.push(init);

				return new Response("document");
			},
			{ refresh: false },
		),
	);
	const download = api.download;

	const response = await download(
		"guest-token",
		"document/1?",
		new AbortController().signal,
	);

	expect(urls).toEqual([
		"/api/v1/public/shipments/documents/document%2F1%3F/download",
	]);
	expect(options[0]).toMatchObject({
		credentials: "omit",
		redirect: "error",
		cache: "no-store",
	});
	expect(await response.text()).toBe("document");
});
