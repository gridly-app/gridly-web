import { expect, test } from "bun:test";
import { act } from "react";
import { ApiError } from "@/shared/http";
import type { SessionState } from "@/ports/session";
import { mountDom } from "../../../../../tests/support/dom";
import { useAuthenticate } from "./useAuthenticate";

function mountAuthentication(authenticate: SessionState["authenticate"]) {
	const dom = mountDom();
	let current: ReturnType<typeof useAuthenticate> | undefined;
	function ReadAuthentication() {
		current = useAuthenticate("login", authenticate);

		return null;
	}

	act(() => dom.root.render(<ReadAuthentication />));

	function read() {
		if (!current) throw new Error("Authentication did not render");

		return current;
	}

	return { ...dom, read };
}

test("authentication sends credentials unchanged and blocks a concurrent submission", async () => {
	const response = Promise.withResolvers<void>();
	const calls: unknown[] = [];
	const model = mountAuthentication(async (mode, credentials) => {
		calls.push({ mode, credentials });

		await response.promise;
	});
	const credentials = { login: "operator", password: " password " };
	let first: Promise<boolean> | undefined;

	try {
		act(() => {
			first = model.read().submit(credentials);
		});
		expect(model.read().isPending).toBe(true);
		expect(await model.read().submit(credentials)).toBe(false);
		expect(calls).toEqual([
			{
				mode: "login",
				credentials: { login: "operator", password: " password " },
			},
		]);

		await act(async () => {
			response.resolve();
			await first;
		});

		expect(await first).toBe(true);
		expect(model.read().isPending).toBe(false);
	} finally {
		await model.close();
	}
});

test("authentication exposes a failed request and allows retry", async () => {
	let attempts = 0;
	const model = mountAuthentication(async () => {
		attempts++;

		if (attempts === 1)
			throw new ApiError("Invalid credentials", 401, "INVALID_CREDENTIALS");
	});
	const credentials = { login: "operator", password: "password" };

	try {
		await act(async () => {
			expect(await model.read().submit(credentials)).toBe(false);
		});

		expect(model.read().isPending).toBe(false);
		expect(model.read().error).toBe(
			"Проверьте логин и пароль и попробуйте ещё раз.",
		);

		await act(async () => {
			expect(await model.read().submit(credentials)).toBe(true);
		});

		expect(model.read().error).toBe("");
		expect(attempts).toBe(2);
	} finally {
		await model.close();
	}
});

test("an unmounted authentication screen does not request navigation after a late response", async () => {
	const response = Promise.withResolvers<void>();
	const model = mountAuthentication(() => response.promise);
	let submission: Promise<boolean> | undefined;

	act(() => {
		submission = model
			.read()
			.submit({ login: "operator", password: "password" });
	});
	act(() => model.root.unmount());
	response.resolve();

	try {
		expect(await submission).toBe(false);
	} finally {
		await model.close();
	}
});
