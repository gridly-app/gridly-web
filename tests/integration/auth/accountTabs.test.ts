import { expect, test } from "bun:test";
import { FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth";
import { memoryStorage } from "@/shared/lib/browserStorage";
import {
	accountStorage,
	immediateLock,
	queuedLock,
} from "./accountSessionFixture";

test("a pending login in a second tab prevents replay under the new account", async () => {
	const storage = memoryStorage();
	const lock = queuedLock();
	const protectedRequests: string[] = [];
	let cookie = "";
	let refreshes = 0;
	let releaseLogin!: () => void;
	let loginStarted!: () => void;
	const loginPending = new Promise<void>((resolve) => {
		loginStarted = resolve;
	});
	function createTab() {
		const http = new FetchHttpClient(
			"/api",
			async (url, options) => {
				if (String(url).endsWith("/auth/login")) {
					const { login } = JSON.parse(String(options?.body));
					cookie = login;
					if (login === "other") {
						loginStarted();
						await new Promise<void>((resolve) => {
							releaseLogin = resolve;
						});
					}
					return Response.json({ user: { login }, access_token: login });
				}
				if (String(url).endsWith("/auth/refresh")) {
					refreshes++;
					return Response.json({ access_token: cookie });
				}
				expect(options?.credentials).toBe("omit");
				protectedRequests.push(
					new Headers(options?.headers).get("Authorization") ?? "",
				);
				return Response.json({}, { status: 401 });
			},
			{
				withRefresh: (refresh, signal) => account.withRefresh(refresh, signal),
				onUnauthorized: () => account.expire(),
			},
		);
		const account: BrowserSessionRepository = new BrowserSessionRepository(
			http,
			storage,
			undefined,
			lock,
		);
		return { account, http };
	}

	const first = createTab();
	await first.account.authenticate("login", {
		login: "operator",
		password: "secret",
	});
	const second = createTab();
	const login = second.account.authenticate("login", {
		login: "other",
		password: "secret",
	});
	await loginPending;
	const request = first.http
		.request("/warehouses")
		.catch((error: unknown) => error);
	releaseLogin();
	await login;
	expect(await request).toMatchObject({ status: 401 });
	expect(protectedRequests).toEqual(["Bearer operator"]);
	expect(refreshes).toBe(0);
	expect(first.account.current()).toBe("");
	expect(second.account.current()).toBe("other");
	expect(JSON.parse(storage.getItem("gridly.user") ?? "{}")).toHaveProperty(
		"login",
		"other",
	);
});

test("a tab does not restore an account after logout times out waiting for the lock", async () => {
	const storage = accountStorage("operator");
	const tabStorage = memoryStorage();
	const blockedLock = async () => {
		throw new DOMException("Waiting for lock", "TimeoutError");
	};
	const http = { request: async () => ({}) };
	const account = new BrowserSessionRepository(
		http,
		storage,
		undefined,
		blockedLock,
		tabStorage,
	);
	await account.restore();
	expect(account.current()).toBe("operator");

	await account.clear();
	expect(storage.getItem("gridly.user")).not.toBeNull();
	const reloaded = new BrowserSessionRepository(
		http,
		storage,
		undefined,
		immediateLock,
		tabStorage,
	);
	await reloaded.restore();
	expect(reloaded.getSnapshot().status).toBe("ended");
});
