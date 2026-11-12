import { expect, test } from "bun:test";
import { FetchHttpClient } from "@/shared/api";

const encoder = new TextEncoder();
function channel() {
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	let canceled = false;
	const stream = new ReadableStream<Uint8Array>({
		start(value) {
			controller = value;
		},
		cancel() {
			canceled = true;
		},
	});
	return {
		stream,
		send(text: string) {
			controller.enqueue(encoder.encode(text));
		},
		close() {
			controller.close();
		},
		get canceled() {
			return canceled;
		},
	};
}
test("stream transport refreshes account bearer and does not parse event data as JSON", async () => {
	const auth: string[] = [];
	const source = channel();
	let aborted = false;
	const client = new FetchHttpClient("/api", async (url, init) => {
		if (String(url).endsWith("/auth/refresh"))
			return Response.json({ access_token: "fresh" });
		const token = new Headers(init?.headers).get("Authorization");
		auth.push(token ?? "");
		if (!token)
			return Response.json({ error: { message: "Expired" } }, { status: 401 });
		init?.signal?.addEventListener("abort", () => {
			aborted = true;
		});
		return new Response(source.stream, {
			headers: { "Content-Type": "text/event-stream" },
		});
	});
	const stream = await client.openStream("/stream");
	const reader = stream.getReader();
	source.send(": heartbeat\n\n");
	expect(new TextDecoder().decode((await reader.read()).value)).toContain(
		"heartbeat",
	);
	expect(auth).toEqual(["", "Bearer fresh"]);
	client.clearSession();
	expect(aborted).toBe(true);
	source.send("data: old session\n\n");
	await expect(reader.read()).rejects.toMatchObject({ name: "AbortError" });
});
test("demo stream sends its own bearer without refresh or cookies", async () => {
	const calls: string[] = [];
	const client = new FetchHttpClient(
		"/api",
		async (url, init) => {
			calls.push(String(url));
			expect(init?.credentials).toBe("omit");
			expect(new Headers(init?.headers).get("Authorization")).toBe(
				"Bearer demo",
			);
			return Response.json({ error: { message: "Expired" } }, { status: 401 });
		},
		{ credentials: "omit", accessToken: () => "demo", refresh: false },
	);
	await expect(client.openStream("/stream")).rejects.toMatchObject({
		status: 401,
	});
	expect(calls).toEqual(["/api/stream"]);
});
