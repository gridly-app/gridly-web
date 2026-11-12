import { afterEach, describe, expect, test } from "bun:test";
import { FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth/api/repository";

import {
	base,
	credentials,
	endDemoSessions,
	setup,
} from "./demoSessionFixture";

afterEach(endDemoSessions);

describe("demo creation and restart", () => {
	test("expiration separates new creation from an unfinished idempotent restart", async () => {
		const keys: string[] = [];
		const revoked: string[] = [];
		const issued = new Map<string, ReturnType<typeof credentials>>();
		let finish!: (response: Response) => void;
		let delayed!: ReturnType<typeof credentials>;
		const { session } = setup((async (_url, options) => {
			const headers = options?.headers as Record<string, string>;
			if (options?.method === "DELETE") {
				const token = headers.Authorization;
				if (!token) throw new Error("Missing authorization header");
				revoked.push(token);
				return new Response(null, { status: 204 });
			}
			const key = headers["Idempotency-Key"];
			if (!key) throw new Error("Missing idempotency key");
			keys.push(key);
			if (!issued.has(key))
				issued.set(key, credentials(String(issued.size + 1)));
			const value = issued.get(key);
			if (!value) throw new Error("Fixture session missing");
			if (keys.length === 2) {
				delayed = value;
				return new Promise<Response>((resolve) => {
					finish = resolve;
				});
			}
			return Response.json(value);
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		await session.start();
		const restart = session.start(true).catch((error) => error);
		session.expire();
		await session.start();
		const activeToken = session.getSnapshot().session?.access_token;
		expect(activeToken).toBeTruthy();
		finish(Response.json(delayed));
		expect(await restart).toHaveProperty("name", "AbortError");
		expect(keys[2]).not.toBe(keys[1]);
		expect(revoked).not.toContain(`Bearer ${activeToken}`);
		expect(session.getSnapshot().status).toBe("active");
	});
	test("lifecycle creates anonymously, uses its own bearer and never refreshes account auth", async () => {
		const calls: { path: string; token: string | null }[] = [];
		const sentCredentials: (RequestCredentials | undefined)[] = [];
		const { session, storage, clears } = setup(async (url, options) => {
			sentCredentials.push(options?.credentials);
			const path = new URL(String(url)).pathname.replace("/api/v1", "");
			const token = new Headers(options?.headers).get("Authorization");
			calls.push({ path, token });
			if (path === "/demo/sessions") return Response.json(credentials());
			if (path === "/warehouses")
				return Response.json(
					{ error: { message: "Expired" } },
					{ status: 401 },
				);
			throw new Error(`Unexpected request: ${options?.method} ${path}`);
		});
		await session.start();
		expect(session.getSnapshot().status).toBe("active");
		await expect(session.http.request("/warehouses")).rejects.toHaveProperty(
			"status",
			401,
		);
		expect(session.getSnapshot().status).toBe("expired");
		expect(storage.getItem("gridly.user")).toBe("operator");
		expect(storage.getItem("gridly.last")).toBe("personal");
		expect(clears()).toBe(2);
		expect(sentCredentials).toEqual(["omit", "omit"]);
		expect(calls).toEqual([
			{ path: "/demo/sessions", token: null },
			{ path: "/warehouses", token: "Bearer demo-first" },
		]);
	});

	test("double click shares creation; retry uses the same idempotency key", async () => {
		const keys: string[] = [];
		let fail = true;
		const { session } = setup((async (_url, options) => {
			if (options?.method === "DELETE")
				return new Response(null, { status: 204 });
			const key = new Headers(options?.headers).get("Idempotency-Key");
			if (!key) throw new Error("Missing idempotency key");
			keys.push(key);
			await Promise.resolve();
			if (fail)
				return Response.json(
					{ error: { message: "Unavailable" } },
					{ status: 503 },
				);
			return Response.json(credentials());
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		const first = session.start();
		expect(session.start()).toBe(first);
		await expect(first).rejects.toThrow("Unavailable");
		fail = false;
		await session.start();
		expect(keys).toHaveLength(2);
		expect(keys[0]).toBeTruthy();
		expect(keys[1]).toBe(keys[0]);
	});

	test("failed restart keeps the old session, token and snapshots; successful restart clears once", async () => {
		let attempt = 0;
		const revoked: string[] = [];
		const { session, storage, clears } = setup((async (_url, options) => {
			if (options?.method === "DELETE") {
				const token = new Headers(options.headers).get("Authorization");
				if (!token) throw new Error("Missing authorization header");
				revoked.push(token);
				return new Response(null, { status: 204 });
			}
			attempt++;
			if (attempt === 2)
				return Response.json({ error: { message: "Busy" } }, { status: 503 });
			return Response.json(credentials(attempt === 1 ? "first" : "second"));
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		await session.start();
		const saved = storage.getItem("gridly.demo.session");
		await expect(session.start(true)).rejects.toThrow("Busy");
		expect(session.getSnapshot()).toMatchObject({
			status: "active",
			session: { access_token: "demo-first" },
		});
		expect(storage.getItem("gridly.demo.session")).toBe(saved);
		expect(clears()).toBe(1);
		expect(revoked).toEqual([]);
		await session.start(true);
		expect(clears()).toBe(2);
		expect(session.getSnapshot().session?.session_id).toBe("second");
		expect(revoked).toEqual(["Bearer demo-first"]);
	});

	test("old responses reject after restart even when transport ignores cancellation", async () => {
		let respond!: (r: Response) => void;
		let creates = 0;
		const { session } = setup((async (url, options) => {
			if (options?.method === "DELETE")
				return new Response(null, { status: 204 });
			if (String(url).endsWith("/demo/sessions"))
				return Response.json(credentials(String(++creates)));
			return new Promise<Response>((resolve) => {
				respond = resolve;
			});
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		await session.start();
		const old = session.http.request("/warehouses");
		await session.start(true);
		respond(Response.json({ stale: true }));
		await expect(old).rejects.toHaveProperty("name", "AbortError");
	});

	test("regular account requests still use their own token while demo is active", async () => {
		let authorization: string | undefined;
		const accountHttp = new FetchHttpClient(base, (async (url, options) => {
			if (String(url).endsWith("/auth/login"))
				return Response.json({
					user: { login: "operator" },
					access_token: "account-token",
				});
			authorization = ((options?.headers ?? {}) as Record<string, string>)
				.Authorization;
			return Response.json([]);
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		const { session, storage } = setup((async () =>
			Response.json(credentials())) as (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => Promise<Response>);
		const account = new BrowserSessionRepository(accountHttp, storage);
		await account.authenticate("login", {
			login: "operator",
			password: "password",
		});
		await session.start();
		await accountHttp.request("/warehouses");
		expect(authorization).toBe("Bearer account-token");
		expect(account.current()).toBe("operator");
	});
});
