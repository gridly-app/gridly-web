import { expect, test } from "bun:test";
import { ApiError, FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth";
import { memoryStorage } from "@/shared/lib/browserStorage";

test("logout clears local identity and data even when revocation fails", async () => {
	const storage = memoryStorage();
	let tokenCleared = false,
		dataCleared = 0;
	const session = new BrowserSessionRepository(
		{
			request: async () => {
				throw new Error("offline");
			},
			clearSession: () => {
				tokenCleared = true;
			},
		},
		storage,
		() => {
			dataCleared++;
		},
	);
	session.remember("operator");
	session.clear();
	expect(session.current()).toBe("");
	expect(storage.getItem("gridly.user")).toBeNull();
	expect(tokenCleared).toBe(true);
	expect(dataCleared).toBe(1);
	await Promise.resolve();
	await Promise.resolve();
	expect(session.getSnapshot().error).toContain("Локальный выход выполнен");
});

test("remembered account waits for a confirmed refresh and network errors are retryable", async () => {
	const storage = memoryStorage();
	storage.setItem("gridly.user", "operator");
	let fail = true;
	const session = new BrowserSessionRepository(
		{
			request: async () => {
				if (fail) throw new Error("offline");
				return {};
			},
		},
		storage,
	);
	expect(session.current()).toBe("");
	expect(session.getSnapshot().status).toBe("restoring");
	await session.restore();
	expect(session.getSnapshot().status).toBe("error");
	expect(storage.getItem("gridly.user")).toBe("operator");
	fail = false;
	await session.restore();
	expect(session.current()).toBe("operator");
});

test("terminal refresh 401 ends only the account session", async () => {
	const storage = memoryStorage();
	storage.setItem("gridly.user", "operator");
	storage.setItem("demo", "keep");
	let clears = 0;
	let session: BrowserSessionRepository;
	const http = new FetchHttpClient(
		"/api",
		async () => Response.json({ message: "expired" }, { status: 401 }),
		{ onUnauthorized: () => session.expire() },
	);
	session = new BrowserSessionRepository(http, storage, () => {
		clears++;
	});
	await session.restore();
	expect(session.getSnapshot().status).toBe("ended");
	expect(session.current()).toBe("");
	expect(clears).toBe(1);
	expect(storage.getItem("demo")).toBe("keep");
});

test("a forbidden response does not terminate a restored account", async () => {
	let unauthorized = 0;
	const http = new FetchHttpClient(
		"/api",
		async () => Response.json({}, { status: 403 }),
		{
			onUnauthorized: () => {
				unauthorized++;
			},
		},
	);
	await expect(http.request("/warehouses")).rejects.toBeInstanceOf(ApiError);
	expect(unauthorized).toBe(0);
});

test("late refresh after local logout cannot restore the previous account", async () => {
	const storage = memoryStorage();
	storage.setItem("gridly.user", "old");
	let release!: (value: unknown) => void;
	const session = new BrowserSessionRepository(
		{
			request: (path) =>
				path === "/auth/refresh"
					? new Promise((resolve) => {
							release = resolve;
						})
					: Promise.resolve({}),
		},
		storage,
	);
	const old = session.restore();
	session.clear();
	release({});
	await old;
	expect(session.current()).toBe("");
});

test("a new login waits for old cookie revocation and ignores its failure", async () => {
	const storage = memoryStorage();
	let release!: () => void;
	const calls: string[] = [];
	const session = new BrowserSessionRepository(
		{
			request: async (path) => {
				calls.push(path);
				if (path === "/auth/logout")
					await new Promise<void>((resolve) => {
						release = resolve;
					});
				return { user: { login: "new" } };
			},
		},
		storage,
	);
	session.remember("old");
	session.clear();
	const login = session.authenticate("login", {
		login: "new",
		password: "secret",
	});
	expect(calls).toEqual(["/auth/logout"]);
	release();
	await login;
	expect(session.current()).toBe("new");
	expect(session.getSnapshot().error).toBe("");
});

test("storage failures do not prevent login or local logout", () => {
	let cleared = 0;
	const session = new BrowserSessionRepository(
		{
			request: async () => ({}),
			clearSession: () => {
				cleared++;
			},
		},
		{
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("full");
			},
			removeItem: () => {
				throw new Error("denied");
			},
		},
	);
	session.remember("operator");
	expect(session.current()).toBe("operator");
	session.expire();
	expect(session.current()).toBe("");
	expect(session.getSnapshot().status).toBe("ended");
	expect(cleared).toBe(1);
});
