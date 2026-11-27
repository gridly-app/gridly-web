import { expect, test } from "bun:test";

import { memoryStorage } from "@/shared/browser/browserStorage";
import { ApiError, FetchHttpClient } from "@/shared/http";

import { httpDouble } from "../../../../../../tests/support/http";

import { BrowserSessionRepository } from "../..";
import {
	accountStorage,
	immediateLock,
	queuedLock,
} from "./accountSession.test-support";
import { accountAuthEndpoints } from "./authEndpoints";

test("remembered account waits for a confirmed refresh and network errors are retryable", async () => {
	const storage = accountStorage("operator");
	let fail = true;
	const session = new BrowserSessionRepository(
		httpDouble({
			request: async () => {
				if (fail) throw new Error("offline");

				return {};
			},
		}),
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
	let clears = 0;

	storage.setItem("sandbox", "keep");

	const http = new FetchHttpClient(
		"/api",
		async () => Response.json({ message: "expired" }, { status: 401 }),
		{ onUnauthorized: () => session.expire() },
	);
	const session: BrowserSessionRepository = new BrowserSessionRepository(
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
	expect(storage.getItem("sandbox")).toBe("keep");
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
	const http = new FetchHttpClient(
		"/api",
		async () =>
			Response.json({ access_token: "other", user: { login: "other" } }),
		{
			auth: accountAuthEndpoints,
			withRefresh: (refresh, signal) => account.withRefresh(refresh, signal),
		},
	);
	const account: BrowserSessionRepository = new BrowserSessionRepository(
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
	let calls = 0;

	storage.setItem("gridly.user", "operator");

	const account = new BrowserSessionRepository(
		httpDouble({
			request: async () => {
				calls++;

				return {};
			},
		}),
		storage,
		undefined,
		queuedLock(),
	);

	await account.restore();

	expect(calls).toBe(0);
	expect(account.getSnapshot().status).toBe("ended");
});

test("a sign-in without browser storage keeps refreshing in the same tab", async () => {
	const storage = {
		...memoryStorage(),
		getItem: () => {
			throw new DOMException("Storage is disabled", "SecurityError");
		},
		setItem: () => {
			throw new DOMException("Storage is disabled", "SecurityError");
		},
	};
	const credentials: (RequestCredentials | undefined)[] = [];
	let refreshes = 0;
	const account = new BrowserSessionRepository(
		httpDouble({
			request: async (_path, options) => {
				credentials.push(options?.credentials);

				return { user: { login: "operator" } };
			},
		}),
		storage,
		undefined,
		immediateLock,
	);

	await account.authenticate("login", { login: "operator", password: "test" });
	await account.withRefresh(async (validate) => {
		refreshes++;
		validate({ user: { login: "operator" } });
	}, new AbortController().signal);

	expect(credentials).toEqual(["include"]);
	expect(refreshes).toBe(1);
	expect(account.current()).toBe("operator");
});
