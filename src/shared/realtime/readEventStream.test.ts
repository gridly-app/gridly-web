import { expect, test } from "bun:test";

import { readEventStream } from "./readEventStream";

test("rejects an invalid media type and cancels the unread response", async () => {
	const reasons: unknown[] = [];
	const body = new ReadableStream({
		cancel: (reason) => {
			reasons.push(reason);
		},
	});
	const response = new Response(body, {
		headers: { "Content-Type": "application/json" },
	});

	await expect(readEventStream(response, () => {})).rejects.toMatchObject({
		status: 502,
		code: "INVALID_RESPONSE",
	});
	expect(reasons).toHaveLength(1);
});

test("cancelling the consumer cancels the original stream with the same reason", async () => {
	const reasons: unknown[] = [];
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("data: update\n\n"));
		},
		cancel(reason) {
			reasons.push(reason);
		},
	});
	const response = new Response(body, {
		headers: { "Content-Type": "text/event-stream" },
	});
	const stream = await readEventStream(response, () => {});
	const reader = stream.getReader();

	expect(new TextDecoder().decode((await reader.read()).value)).toBe(
		"data: update\n\n",
	);
	await reader.cancel("subscription closed");

	expect(reasons).toEqual(["subscription closed"]);
});
