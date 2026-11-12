import { expect, spyOn, test } from "bun:test";
import { ApiError, FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth";
import { memoryStorage } from "@/shared/lib/browserStorage";
import {
	accountStorage,
	immediateLock,
	queuedLock,
} from "./accountSessionFixture";

test("remembered account waits for a confirmed refresh and network errors are retryable", async () => {
	const storage = accountStorage("operator");
	let fail = true;
	const session = new BrowserSessionRepository(
		{
			request: async () => {
				if (fail) throw new Error("offline");
				return {};
			},
		},
		storage,
		undefined,
		immediateLock,
	);
	expect(session.current()).toBe("");
	expect(session.getSnapshot().status).toBe("restoring");
	await session.restore();
	expect(session.getSnapshot().status).toBe("error");
	expect(JSON.parse(storage.getItem("gridly.user") ?? "{}")).toHaveProperty(
		"login",
		"operator",
	);
	fail = false;
	await session.restore();
	expect(session.current()).toBe("operator");
});

test("terminal refresh 401 ends only the account session", async () => {
	const storage = accountStorage("operator");
	storage.setItem("demo", "keep");
	let clears = 0;
	let session: BrowserSessionRepository;
	const http = new FetchHttpClient(
		"/api",
		async () => Response.json({ message: "expired" }, { status: 401 }),
		{ onUnauthorized: () => session.expire() },
	);
	session = new BrowserSessionRepository(
		http,
		storage,
		() => {
			clears++;
		},
		immediateLock,
	);
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

test("refresh rejects a different identity before storing its bearer", async () => {
	const storage = accountStorage("operator");
	let account: BrowserSessionRepository;
	const http = new FetchHttpClient(
		"/api",
		async () =>
			Response.json({ access_token: "other", user: { login: "other" } }),
		{
			withRefresh: (refresh, signal) => account.withRefresh(refresh, signal),
		},
	);
	account = new BrowserSessionRepository(
		http,
		storage,
		undefined,
		queuedLock(),
	);
	await account.restore();
	expect(account.getSnapshot().status).toBe("ended");
	expect(account.current()).toBe("");
});

test("legacy account names require a new sign-in", async () => {
	const storage = memoryStorage();
	storage.setItem("gridly.user", "operator");
	let calls = 0;
	const account = new BrowserSessionRepository(
		{
			request: async () => {
				calls++;
				return {};
			},
		},
		storage,
		undefined,
		queuedLock(),
	);
	await account.restore();
	expect(calls).toBe(0);
	expect(account.getSnapshot().status).toBe("ended");
});

test("a memory-only sign-in does not need a persistent account identifier", async () => {
	const storage = {
		...memoryStorage(),
		setItem: () => {
			throw new Error("Storage unavailable");
		},
	};
	const uuid = spyOn(crypto, "randomUUID");
	try {
		const account = new BrowserSessionRepository(
			{
				request: async (_path, options) => {
					expect(options?.credentials).toBe("omit");
					return { user: { login: "operator" } };
				},
			},
			storage,
			undefined,
			immediateLock,
		);
		await account.authenticate("login", {
			login: "operator",
			password: "test",
		});
		expect(account.current()).toBe("operator");
		expect(uuid).not.toHaveBeenCalled();
	} finally {
		uuid.mockRestore();
	}
});
