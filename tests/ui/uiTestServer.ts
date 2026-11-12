import { fileURLToPath } from "node:url";
import { createServer } from "vite";

export async function startUiTestServer(
	existingUrl = process.env.GRIDLY_UI_URL,
) {
	if (existingUrl) {
		return {
			base: existingUrl,
			hasLocalStream: false,
			streamRequests: 0,
			activeStreamCount: 0,
			close: async () => undefined,
		};
	}
	const server = await createServer({
		root: fileURLToPath(new URL("../../", import.meta.url)),
		server: { host: "127.0.0.1", port: 4175, watch: null },
	});
	try {
		await server.listen();
		const upstream = server.resolvedUrls?.local[0];
		if (!upstream) throw new Error("Vite did not report a local test URL");
		return startStreamProxy(upstream, () => server.close());
	} catch (error) {
		await server.close();
		throw error;
	}
}

function startStreamProxy(upstream: string, closeServer: () => Promise<void>) {
	let streamRequests = 0;
	const activeStreams = new Set<ReadableStreamDefaultController<Uint8Array>>();
	const proxy = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		idleTimeout: 0,
		fetch(request) {
			const url = new URL(request.url);
			if (url.pathname.endsWith("/stream")) {
				streamRequests++;
				let timer: ReturnType<typeof setInterval> | undefined;
				let controller: ReadableStreamDefaultController<Uint8Array>;
				const cleanup = () => {
					clearInterval(timer);
					if (controller) activeStreams.delete(controller);
				};
				const stream = new ReadableStream<Uint8Array>({
					start(c) {
						controller = c;
						activeStreams.add(c);
						c.enqueue(new TextEncoder().encode(": connected\n\n"));
						timer = setInterval(
							() => c.enqueue(new TextEncoder().encode(": heartbeat\n\n")),
							10000,
						);
						request.signal.addEventListener("abort", cleanup, {
							once: true,
						});
					},
					cancel() {
						cleanup();
					},
				});
				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
					},
				});
			}
			return fetch(
				new Request(new URL(url.pathname + url.search, upstream), request),
			).catch(() => new Response("Starting test server", { status: 503 }));
		},
	});

	return {
		base: proxy.url.origin,
		hasLocalStream: true,
		get streamRequests() {
			return streamRequests;
		},
		get activeStreamCount() {
			return activeStreams.size;
		},
		async close() {
			await proxy.stop(true);
			await closeServer();
		},
	};
}
