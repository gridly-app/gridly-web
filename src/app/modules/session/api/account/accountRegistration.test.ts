import { expect, test } from "bun:test";

import { memoryStorage } from "@/shared/browser/browserStorage";
import { ApiError, type HttpClient } from "@/shared/http";

import { httpDouble } from "../../../../../../tests/support/http";

import { immediateLock } from "./accountSession.test-support";
import { BrowserSessionRepository } from "./repository";

const credentials = { login: "new-reviewer", password: "example password" };

test("registration creates an account before signing in with the same credentials", async () => {
	const requests: unknown[] = [];
	const http: HttpClient = {
		request: async (path, options) => {
			requests.push({
				path,
				method: options?.method,
				body: options?.body,
				credentials: options?.credentials,
			});

			return path === "/auth/login"
				? { user: { login: credentials.login } }
				: {};
		},
	};
	const repository = new BrowserSessionRepository(
		httpDouble(http),
		memoryStorage(),
		undefined,
		immediateLock,
		memoryStorage(),
	);

	expect(await repository.authenticate("register", credentials)).toBe(
		credentials.login,
	);
	expect(repository.getSnapshot()).toMatchObject({
		status: "active",
		user: credentials.login,
	});
	expect(requests).toEqual([
		{
			path: "/auth/register",
			method: "POST",
			body: credentials,
			credentials: "omit",
		},
		{
			path: "/auth/login",
			method: "POST",
			body: credentials,
			credentials: "include",
		},
	]);
});

test("a rejected registration never submits login", async () => {
	const requests: string[] = [];
	const repository = new BrowserSessionRepository(
		httpDouble({
			request: async (path) => {
				requests.push(path);

				throw new ApiError("Login already exists", 409, "LOGIN_ALREADY_EXISTS");
			},
		}),
		memoryStorage(),
		undefined,
		immediateLock,
		memoryStorage(),
	);

	await expect(
		repository.authenticate("register", credentials),
	).rejects.toMatchObject({ status: 409 });
	expect(requests).toEqual(["/auth/register"]);
	expect(repository.getSnapshot().status).toBe("ended");
});
