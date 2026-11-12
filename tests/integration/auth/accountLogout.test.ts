import { expect, test } from "bun:test";
import { ApiError } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth";
import { memoryStorage } from "@/shared/lib/browserStorage";
import {
	accountStorage,
	immediateLock,
	queuedLock,
} from "./accountSessionFixture";

test("logout clears local identity and data even when revocation fails", async () => {
	const storage = memoryStorage();
	let tokenCleared = false,
		dataCleared = 0;
	const session = new BrowserSessionRepository(
		{
			request: async (path) => {
				if (path === "/auth/logout") throw new Error("offline");
				return { user: { login: "operator" } };
			},
			clearSession: () => {
				tokenCleared = true;
			},
		},
		storage,
		() => {
			dataCleared++;
		},
		immediateLock,
	);
	await session.authenticate("login", {
		login: "operator",
		password: "secret",
	});
	const beforeLogout = dataCleared;
	const cleared = session.clear();
	expect(session.current()).toBe("");
	expect(storage.getItem("gridly.user")).toBeNull();
	expect(tokenCleared).toBe(true);
	expect(dataCleared).toBe(beforeLogout + 1);
	await cleared;
	expect(session.getSnapshot().error).toContain("Локальный выход выполнен");
});

test("late refresh after local logout cannot restore the previous account", async () => {
	const storage = accountStorage("old");
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
		undefined,
		immediateLock,
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
		undefined,
		immediateLock,
	);
	await session.authenticate("login", { login: "old", password: "secret" });
	calls.length = 0;
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

test("storage failures do not prevent login or local logout", async () => {
	let cleared = 0;
	const session = new BrowserSessionRepository(
		{
			request: async () => ({ user: { login: "operator" } }),
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
		undefined,
		immediateLock,
	);
	await session.authenticate("login", {
		login: "operator",
		password: "secret",
	});
	expect(session.current()).toBe("operator");
	session.expire();
	expect(session.current()).toBe("");
	expect(session.getSnapshot().status).toBe("ended");
	expect(cleared).toBe(1);
});

test("rejected credentials preserve the current browser association", async () => {
	const storage = accountStorage("operator");
	const previous = storage.getItem("gridly.user");
	const account = new BrowserSessionRepository(
		{
			request: async (path) => {
				if (path === "/auth/login")
					throw new ApiError("Wrong password", 401, "INVALID_CREDENTIALS");
				return {};
			},
		},
		storage,
		undefined,
		queuedLock(),
	);
	await account.restore();
	await expect(
		account.authenticate("login", {
			login: "operator",
			password: "wrong password",
		}),
	).rejects.toHaveProperty("code", "INVALID_CREDENTIALS");
	expect(account.current()).toBe("operator");
	expect(storage.getItem("gridly.user")).toBe(previous);
});
