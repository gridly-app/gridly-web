import { afterEach, describe, expect, test } from "bun:test";
import { FetchHttpClient } from "../src/shared/api";
import { ServerDemoSession } from "../src/shared/auth/model/ServerDemoSession";
import { warehousePath } from "../src/shared/config/workspacePaths";

const base = "http://gridly-demo.test/api/v1";
const credentials = (id = "first") => ({
	session_id: id,
	access_token: `demo-${id}`,
	expires_at: new Date(Date.now() + 3600000).toISOString(),
	initial_warehouse_id: `warehouse-${id}`,
});
function memory() {
	const data = new Map<string, string>([
		["gridly.user", "operator"],
		["gridly.last", "personal"],
	]);
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}
const sessions: ServerDemoSession[] = [];
afterEach(() => {
	for (const s of sessions.splice(0)) s.end();
});
function setup(
	transport: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response> = fetch,
) {
	const storage = memory();
	let clears = 0;
	const session = new ServerDemoSession(
		storage,
		base,
		() => {
			clears++;
		},
		transport,
	);
	sessions.push(session);
	return { storage, session, clears: () => clears };
}
describe("independent server demo", () => {
	test("restart, expiration and exit clean only the ended session forms", async () => {
		let created = 0;
		const cleared: string[] = [];
		const session = new ServerDemoSession(
			memory(),
			base,
			() => undefined,
			(async (_url, options) => {
				if (options?.method === "DELETE")
					return new Response(null, { status: 204 });
				return Response.json(credentials(String(++created)));
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
			(id) => {
				cleared.push(id);
			},
		);
		sessions.push(session);
		await session.start();
		expect(cleared).toEqual([]);
		await session.start(true);
		expect(cleared).toEqual(["1"]);
		session.expire();
		expect(cleared).toEqual(["1", "2"]);
		await session.start();
		session.end();
		expect(cleared).toEqual(["1", "2", "3"]);
	});
	test("expiration separates new creation from an unfinished idempotent restart", async () => {
		const keys: string[] = [];
		const revoked: string[] = [];
		const issued = new Map<string, ReturnType<typeof credentials>>();
		let finish!: (response: Response) => void;
		let delayed!: ReturnType<typeof credentials>;
		const { session } = setup((async (_url, options) => {
			const headers = options?.headers as Record<string, string>;
			if (options?.method === "DELETE") {
				revoked.push(headers.Authorization);
				return new Response(null, { status: 204 });
			}
			const key = headers["Idempotency-Key"];
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

	test("reload validates the same session and preserves the last demo warehouse", async () => {
		let creates = 0;
		const transport = async (url: RequestInfo | URL, options?: RequestInit) => {
			const path = new URL(String(url)).pathname;
			if (path === "/api/v1/demo/sessions" && options?.method === "POST") {
				creates++;
				return Response.json(credentials());
			}
			if (path === "/api/v1/demo/session") {
				expect(new Headers(options?.headers).get("Authorization")).toBe(
					"Bearer demo-first",
				);
				if (options?.method === "GET") return Response.json(credentials());
				if (options?.method === "DELETE")
					return new Response(null, { status: 204 });
			}
			throw new Error(`Unexpected request: ${options?.method} ${path}`);
		};
		const { session, storage } = setup(transport);
		await session.start();
		session.rememberWarehouse("other");
		const reloaded = new ServerDemoSession(
			storage,
			base,
			() => undefined,
			transport,
		);
		sessions.push(reloaded);
		expect(reloaded.getSnapshot().status).toBe("idle");
		await reloaded.restore();
		expect(reloaded.getSnapshot()).toMatchObject({
			status: "active",
			session: { last_warehouse_id: "other" },
		});
		expect(creates).toBe(1);
	});

	test("double click shares creation; retry uses the same idempotency key", async () => {
		const keys: string[] = [];
		let fail = true;
		const { session } = setup((async (_url, options) => {
			if (options?.method === "DELETE")
				return new Response(null, { status: 204 });
			keys.push(
				((options?.headers ?? {}) as Record<string, string>)["Idempotency-Key"],
			);
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
				revoked.push((options.headers as Record<string, string>).Authorization);
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

	test("explicit exit clears local access even when DELETE fails, and preserves account session", async () => {
		const requests: string[] = [];
		const { session, storage } = setup((async (url, options) => {
			requests.push(String(url));
			return options?.method === "DELETE"
				? Response.error()
				: Response.json(credentials());
		}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>);
		await session.start();
		session.end();
		expect(session.getSnapshot()).toMatchObject({
			status: "idle",
			session: null,
		});
		expect(storage.getItem("gridly.demo.session")).toBeNull();
		expect(storage.getItem("gridly.user")).toBe("operator");
		expect(requests.some((url) => url.includes("/auth/"))).toBe(false);
	});

	test("expired saved sessions and malformed storage do not create demo implicitly", async () => {
		const storage = memory();
		storage.setItem("gridly.demo", "true");
		storage.setItem(
			"gridly.demo.session",
			JSON.stringify({ ...credentials(), expires_at: "2020-01-01T00:00:00Z" }),
		);
		const expired = new ServerDemoSession(
			storage,
			base,
			() => undefined,
			(() => {
				throw new Error("Unexpected request");
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
		);
		sessions.push(expired);
		await expired.restore();
		expect(expired.getSnapshot().status).toBe("expired");
		expect(storage.getItem("gridly.demo")).toBeNull();
		storage.setItem("gridly.demo.session", "invalid");
		const malformed = new ServerDemoSession(storage, base, () => undefined);
		sessions.push(malformed);
		expect(malformed.getSnapshot().session).toBeNull();
	});

	test("network failure restoring is retryable and keeps the saved session", async () => {
		let fail = true;
		const storage = memory();
		storage.setItem("gridly.demo.session", JSON.stringify(credentials()));
		const session = new ServerDemoSession(
			storage,
			base,
			() => undefined,
			(async () => {
				if (fail) throw new TypeError("Network unavailable");
				return Response.json(credentials());
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
		);
		sessions.push(session);
		await session.restore();
		expect(session.getSnapshot()).toMatchObject({
			status: "error",
			session: { session_id: "first" },
		});
		fail = false;
		await session.restore();
		expect(session.getSnapshot().status).toBe("active");
	});

	test("all workspace links use the explicit mode and encode the warehouse identity", () => {
		expect(warehousePath("demo", "a/b", "catalog")).toBe(
			"/demo/warehouses/a%2Fb/catalog",
		);
		expect(warehousePath("standard", "personal")).toBe(
			"/warehouses/personal/map",
		);
	});
});

test("demo ends locally despite failed storage removal, form cleanup and revocation", async () => {
	const storage = memory();
	let clears = 0;
	const session = new ServerDemoSession(
		storage,
		base,
		() => {
			clears++;
		},
		async (_url, options) => {
			if (options?.method === "DELETE") throw new TypeError("offline");
			return Response.json(credentials());
		},
		() => {
			throw new Error("denied");
		},
	);
	await session.start();
	storage.removeItem = () => {
		throw new Error("denied");
	};
	const old = session.http.request("/warehouses");
	session.end();
	expect(session.getSnapshot()).toMatchObject({
		status: "idle",
		session: null,
	});
	expect(clears).toBe(2);
	await expect(old).rejects.toHaveProperty("name", "AbortError");
	await Promise.resolve();
	expect(session.getSnapshot().status).toBe("idle");
});

test("unreadable and unremovable saved demo does not break startup", () => {
	const session = new ServerDemoSession(
		{
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
			removeItem: () => {
				throw new Error("denied");
			},
		},
		base,
		() => undefined,
	);
	expect(session.getSnapshot()).toMatchObject({
		status: "idle",
		session: null,
	});
});
