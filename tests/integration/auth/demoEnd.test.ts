import { afterEach, describe, expect, test } from "bun:test";
import { ServerDemoSession } from "@/shared/auth/model/ServerDemoSession";

import {
	base,
	credentials,
	endDemoSessions,
	memory,
	sessions,
	setup,
} from "./demoSessionFixture";

afterEach(endDemoSessions);

describe("demo session cleanup", () => {
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
