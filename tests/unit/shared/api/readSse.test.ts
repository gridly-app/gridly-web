import { expect, test } from "bun:test";
import { readSse, type ServerEvent } from "@/shared/api/readSse";

const encoder = new TextEncoder();
test("SSE decoder handles byte-split UTF8, CRLF, comments and multiline data", async () => {
	const bytes = encoder.encode(
		": heartbeat\r\nid: 2\r\nevent: STATE_PATCH\r\ndata: Привет\r\ndata: мир\r\n\r\n",
	);
	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			for (const byte of bytes) c.enqueue(new Uint8Array([byte]));
			c.close();
		},
	});
	const events: ServerEvent[] = [];
	let activity = 0;
	await readSse(
		stream,
		async (e) => {
			events.push(e);
		},
		() => activity++,
		new AbortController().signal,
	);
	expect(events).toEqual([
		{ id: "2", event: "STATE_PATCH", data: "Привет\nмир" },
	]);
	expect(activity).toBe(bytes.length);
});
