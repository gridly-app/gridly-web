import { describe, expect, test } from "bun:test";
import { ApiError, FetchHttpClient } from "../src/shared/api";

function clientWith(
	transport: (url: string, options: RequestInit) => Promise<Response>,
) {
	return new FetchHttpClient("/api", transport as typeof fetch);
}

describe("HTTP session lifecycle", () => {
	test("concurrent unauthorized requests share one refresh and retry with its token", async () => {
		let refreshes = 0;
		const client = clientWith(async (url, options) => {
			if (url.endsWith("/auth/refresh")) {
				refreshes++;
				await Promise.resolve();
				return Response.json({ access_token: "fresh" });
			}
			return (options.headers as Record<string, string>).Authorization ===
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
