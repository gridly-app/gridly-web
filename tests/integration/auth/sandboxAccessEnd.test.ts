import { afterEach, describe, expect, test } from "bun:test";
import { AnonymousSandboxAccess } from "@/app/modules/session/model/AnonymousSandboxAccess";

import {
	base,
	credentials,
	endSandboxSessions,
	memory,
	sessions,
	setup,
} from "./sandboxAccessFixture";

afterEach(endSandboxSessions);

describe("sandbox session cleanup", () => {
	test("restart and exit revoke their previous sandbox access token", async () => {
		let created = 0;
		const revoked: string[] = [];
		const session = new AnonymousSandboxAccess(
			memory(),
			base,
			() => undefined,
			(async (_url, options) => {
				if (options?.method === "DELETE") {
					revoked.push(new Headers(options.headers).get("Authorization") ?? "");
					return new Response(null, { status: 204 });
				}
				return Response.json(credentials(String(++created)));
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
		);
		sessions.push(session);
		await session.start();
		await session.start(true);
		await Promise.resolve();
		expect(revoked).toEqual(["Bearer sandbox-1"]);
		session.expire();
		await session.start();
		session.end();
		await Promise.resolve();
		expect(revoked).toEqual(["Bearer sandbox-1", "Bearer sandbox-3"]);
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
			access: null,
		});
		expect(storage.getItem("gridly.sandbox.access")).toBeNull();
		expect(storage.getItem("gridly.user")).toBe("operator");
		expect(requests.some((url) => url.includes("/auth/"))).toBe(false);
	});
});

test("sandbox ends locally despite failed storage removal and revocation", async () => {
	const storage = memory();
	let clears = 0;
	const session = new AnonymousSandboxAccess(
		storage,
		base,
		() => {
			clears++;
		},
		async (_url, options) => {
			if (options?.method === "DELETE") throw new TypeError("offline");
			return Response.json(credentials());
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
		access: null,
	});
	expect(clears).toBe(2);
	await expect(old).rejects.toHaveProperty("name", "AbortError");
	await Promise.resolve();
	expect(session.getSnapshot().status).toBe("idle");
});
