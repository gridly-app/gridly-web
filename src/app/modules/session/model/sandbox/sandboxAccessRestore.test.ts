import { afterEach, describe, expect, test } from "bun:test";
import { AnonymousSandboxAccess } from "@/app/modules/session/model/sandbox/AnonymousSandboxAccess";

import {
	base,
	credentials,
	endSandboxSessions,
	memory,
	sessions,
	setup,
} from "./sandboxAccess.test-support";

afterEach(endSandboxSessions);

describe("sandbox restoration", () => {
	test("reload validates the same session and preserves the last sandbox warehouse", async () => {
		let creates = 0;
		const transport = async (url: RequestInfo | URL, options?: RequestInit) => {
			const path = new URL(String(url)).pathname;
			if (path === "/api/v1/sandbox/access" && options?.method === "POST") {
				creates++;
				return Response.json(credentials());
			}
			if (path === "/api/v1/sandbox/access") {
				expect(new Headers(options?.headers).get("Authorization")).toBe(
					"Bearer sandbox-first",
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
		const reloaded = new AnonymousSandboxAccess(
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
			access: { last_warehouse_id: "other" },
		});
		expect(creates).toBe(1);
	});

	test("invalid saved access and malformed storage do not create sandbox implicitly", async () => {
		const storage = memory();
		storage.setItem("gridly.sandbox", "true");
		storage.setItem("gridly.sandbox.access", JSON.stringify(credentials()));
		const calls: string[] = [];
		const expired = new AnonymousSandboxAccess(
			storage,
			base,
			() => undefined,
			(async (input) => {
				calls.push(String(input));
				return Response.json(
					{ error: { message: "Unauthorized" } },
					{ status: 401 },
				);
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
		);
		sessions.push(expired);
		await expired.restore();
		expect(expired.getSnapshot().status).toBe("expired");
		expect(storage.getItem("gridly.sandbox.access")).toBeNull();
		expect(calls).toHaveLength(1);
		expect(storage.getItem("gridly.sandbox")).toBeNull();
		storage.setItem("gridly.sandbox.access", "invalid");
		const malformed = new AnonymousSandboxAccess(
			storage,
			base,
			() => undefined,
		);
		sessions.push(malformed);
		expect(malformed.getSnapshot().access).toBeNull();
	});

	test.each([
		["unauthorized access", () => new Response(null, { status: 401 })],
		["different access ID", () => Response.json(credentials("other"))],
	] as const)(
		"opening the sandbox replaces %s",
		async (_reason, checkAccess) => {
			const storage = memory();
			storage.setItem(
				"gridly.sandbox.access",
				JSON.stringify({
					...credentials(),
					last_warehouse_id: "old-warehouse",
				}),
			);
			const calls: { method: string | undefined; token: string | null }[] = [];
			const session = new AnonymousSandboxAccess(
				storage,
				base,
				() => undefined,
				async (_url, options) => {
					const token = new Headers(options?.headers).get("Authorization");
					if (options?.method === "DELETE")
						return new Response(null, { status: 204 });
					calls.push({ method: options?.method, token });
					return options?.method === "POST"
						? Response.json(credentials("fresh"))
						: checkAccess();
				},
			);
			sessions.push(session);

			await session.start();

			expect(session.getSnapshot()).toEqual({
				status: "active",
				access: credentials("fresh"),
				error: "",
			});
			expect(
				JSON.parse(storage.getItem("gridly.sandbox.access") ?? "null"),
			).toEqual(credentials("fresh"));
			expect(calls).toEqual([
				{ method: "GET", token: "Bearer sandbox-first" },
				{ method: "POST", token: null },
			]);
		},
	);

	test("network failure restoring is retryable and keeps the saved session", async () => {
		let fail = true;
		const storage = memory();
		storage.setItem("gridly.sandbox.access", JSON.stringify(credentials()));
		const session = new AnonymousSandboxAccess(
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
			access: { access_id: "first" },
		});
		fail = false;
		await session.restore();
		expect(session.getSnapshot().status).toBe("active");
	});
});

test("unreadable and unremovable saved sandbox does not break startup", () => {
	const session = new AnonymousSandboxAccess(
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
		access: null,
	});
});
