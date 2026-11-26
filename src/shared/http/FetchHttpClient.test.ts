import { describe, expect, test } from "bun:test";
import { ApiError, FetchHttpClient } from "@/shared/http";

const auth = {
	prefix: "/auth/",
	login: "/auth/login",
	refresh: "/auth/refresh",
};

function clientWith(
	transport: (url: string, options: RequestInit) => Promise<Response>,
) {
	return new FetchHttpClient(
		"/api",
		(input, options = {}) => transport(String(input), options),
		{ auth },
	);
}

describe("HTTP session lifecycle", () => {
	test("login invalidates an older refresh and its original request", async () => {
		let finishRefresh!: (response: Response) => void;
		let refreshStarted!: () => void;
		const started = new Promise<void>((resolve) => {
			refreshStarted = resolve;
		});
		const tokens: (string | null)[] = [];
		const client = clientWith(async (url, options) => {
			if (url.endsWith("/auth/login"))
				return Response.json({ access_token: "new-account" });
			if (url.endsWith("/auth/refresh")) {
				refreshStarted();
				return new Promise<Response>((resolve) => {
					finishRefresh = resolve;
				});
			}
			const token = new Headers(options.headers).get("Authorization");
			tokens.push(token);
			return token
				? Response.json({ ok: true })
				: Response.json({}, { status: 401 });
		});
		const old = client.request("/warehouses").catch((error) => error);
		await started;
		await client.request("/auth/login", { method: "POST" });
		finishRefresh(Response.json({ access_token: "old-account" }));
		expect(await old).toHaveProperty("name", "AbortError");
		await client.request("/warehouses");
		expect(tokens.at(-1)).toBe("Bearer new-account");
	});
	test("concurrent unauthorized requests share one refresh and retry with its token", async () => {
		let refreshes = 0;
		const client = clientWith(async (url, options) => {
			if (url.endsWith("/auth/refresh")) {
				refreshes++;
				await Promise.resolve();
				return Response.json({ access_token: "fresh" });
			}
			return new Headers(options.headers).get("Authorization") ===
				"Bearer fresh"
				? Response.json({ ok: true })
				: Response.json({}, { status: 401 });
		});
		const results = await Promise.all([
			client.request("/one"),
			client.request("/two"),
		]);
		expect(results).toEqual([{ ok: true }, { ok: true }]);
		expect(refreshes).toBe(1);
	});

	test("clearing the session invalidates an in-flight response", async () => {
		let respond!: (response: Response) => void;
		const client = clientWith(
			() =>
				new Promise((resolve) => {
					respond = resolve;
				}),
		);
		const request = client.request("/warehouse");
		client.clearSession();
		respond(Response.json({ stale: true }));
		await expect(request).rejects.toHaveProperty("name", "AbortError");
	});

	test("refreshing authentication never resends a layout write", async () => {
		const paths: string[] = [];
		const client = clientWith(async (url, options) => {
			paths.push(url);

			if (url.endsWith("/auth/refresh"))
				return Response.json({ access_token: "fresh" });
			if (
				new Headers(options.headers).get("Authorization") === "Bearer fresh"
			) {
				return new Response(null, { status: 204 });
			}

			return Response.json({}, { status: 401 });
		});

		await expect(
			client.request("/warehouse/layout/commit", { method: "POST" }),
		).rejects.toMatchObject({ status: 401 });
		await client.request("/warehouse");
		expect(paths).toEqual([
			"/api/warehouse/layout/commit",
			"/api/auth/refresh",
			"/api/warehouse",
		]);
	});

	test("a read and a refetch with other query parameters respect Retry-After", async () => {
		let reads = 0;
		const client = clientWith(async () => {
			reads++;
			return Response.json(
				{},
				{ status: 429, headers: { "Retry-After": "60" } },
			);
		});

		await expect(client.request("/warehouse?after=1")).rejects.toMatchObject({
			status: 429,
			retryAfterMs: 60000,
		});
		const controller = new AbortController();
		const refetch = client.request("/warehouse?after=2", {
			signal: controller.signal,
		});
		controller.abort();

		await expect(refetch).rejects.toMatchObject({ name: "AbortError" });
		expect(reads).toBe(1);
	});

	test("refresh rejects missing access tokens without retrying indefinitely", async () => {
		const client = clientWith(async (url) =>
			url.endsWith("/auth/refresh")
				? Response.json({})
				: Response.json({}, { status: 401 }),
		);
		await expect(client.request("/warehouse")).rejects.toHaveProperty(
			"code",
			"INVALID_RESPONSE",
		);
	});

	test("preserves structured server errors and idempotency keys", async () => {
		let headers: RequestInit["headers"];
		const client = clientWith(async (_url, options) => {
			headers = options.headers;
			return Response.json(
				{
					error: { code: "STALE_REVISION", message: "Conflict" },
					request_id: "req-1",
				},
				{ status: 409 },
			);
		});
		const error = await client
			.request("/warehouse", {
				method: "POST",
				body: {},
				idempotencyKey: "same-command",
			})
			.catch((error) => error);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			status: 409,
			code: "STALE_REVISION",
			requestId: "req-1",
		});
		expect(headers).toHaveProperty("Idempotency-Key", "same-command");
	});

	test("successful empty responses do not require JSON", async () => {
		const client = clientWith(async () => new Response(null, { status: 204 }));
		expect(await client.request("/warehouse")).toBeUndefined();
	});

	test("invalid success JSON reports an explicit transport error", async () => {
		const client = clientWith(async () => new Response("not json"));
		await expect(client.request("/warehouse")).rejects.toHaveProperty(
			"code",
			"INVALID_RESPONSE",
		);
	});
});

test("empty refresh responses cannot trigger a protected retry", async () => {
	let reads = 0;
	const client = clientWith(async (url) => {
		if (url.endsWith("/auth/refresh"))
			return new Response(null, { status: 204 });
		reads++;
		return Response.json({}, { status: 401 });
	});
	await expect(client.request("/warehouses")).rejects.toHaveProperty(
		"code",
		"INVALID_RESPONSE",
	);
	expect(reads).toBe(1);
});

test("canceling one request leaves its shared refresh available to another", async () => {
	let releaseRefresh!: (response: Response) => void;
	let notifyStarted!: () => void;
	let refreshes = 0;
	const started = new Promise<void>((resolve) => {
		notifyStarted = resolve;
	});
	const client = clientWith(async (url, options) => {
		if (url.endsWith("/auth/refresh")) {
			refreshes++;
			notifyStarted();
			return new Promise<Response>((resolve) => {
				releaseRefresh = resolve;
			});
		}
		return new Headers(options.headers).get("Authorization") === "Bearer fresh"
			? Response.json({ ok: true })
			: Response.json({}, { status: 401 });
	});

	const controller = new AbortController();
	const canceled = client.request("/first", { signal: controller.signal });
	const surviving = client.request("/second");
	await started;
	controller.abort();
	await expect(canceled).rejects.toHaveProperty("name", "AbortError");
	releaseRefresh(Response.json({ access_token: "fresh" }));
	expect(await surviving).toEqual({ ok: true });
	expect(refreshes).toBe(1);
});

test.each([400, 403, 404, 409, 500])(
	"an HTTP %d preserves the failure and never resends a write",
	async (status) => {
		const calls: string[] = [];
		const client = clientWith(async (url, options) => {
			calls.push(`${options.method} ${url}`);

			return status === 500
				? new Response("<html>Internal failure</html>", { status })
				: Response.json(
						{ error: { code: "WRITE_REJECTED", message: "Rejected" } },
						{ status },
					);
		});

		await expect(
			client.request("/orders", { method: "POST", body: {} }),
		).rejects.toMatchObject({
			status,
			code: status === 500 ? undefined : "WRITE_REJECTED",
		});
		expect(calls).toEqual(["POST /api/orders"]);
	},
);

test("a request timeout propagates its reason without attempting another write", async () => {
	const transportStarted = Promise.withResolvers<void>();
	let calls = 0;
	const controller = new AbortController();
	const timeout = new DOMException("Request timed out", "TimeoutError");
	const client = clientWith(async (_url, options) => {
		calls++;

		return new Promise<Response>((_resolve, reject) => {
			options.signal?.addEventListener(
				"abort",
				() => reject(options.signal?.reason),
				{ once: true },
			);
			transportStarted.resolve();
		});
	});

	const request = client.request("/orders", {
		method: "POST",
		signal: controller.signal,
	});
	await transportStarted.promise;
	controller.abort(timeout);

	await expect(request).rejects.toBe(timeout);
	expect(calls).toBe(1);
});
