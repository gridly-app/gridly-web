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

describe("demo restoration", () => {
	test("reload validates the same session and preserves the last demo warehouse", async () => {
		let creates = 0;
		const transport = async (url: RequestInfo | URL, options?: RequestInit) => {
			const path = new URL(String(url)).pathname;
			if (path === "/api/v1/demo/sessions" && options?.method === "POST") {
				creates++;
				return Response.json(credentials());
			}
			if (path === "/api/v1/demo/session") {
				expect(new Headers(options?.headers).get("Authorization")).toBe(
					"Bearer demo-first",
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
		const reloaded = new ServerDemoSession(
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
			session: { last_warehouse_id: "other" },
		});
		expect(creates).toBe(1);
	});

	test("expired saved sessions and malformed storage do not create demo implicitly", async () => {
		const storage = memory();
		storage.setItem("gridly.demo", "true");
		storage.setItem(
			"gridly.demo.session",
			JSON.stringify({ ...credentials(), expires_at: "2020-01-01T00:00:00Z" }),
		);
		const expired = new ServerDemoSession(
			storage,
			base,
			() => undefined,
			(() => {
				throw new Error("Unexpected request");
			}) as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
		);
		sessions.push(expired);
		await expired.restore();
		expect(expired.getSnapshot().status).toBe("expired");
		expect(storage.getItem("gridly.demo")).toBeNull();
		storage.setItem("gridly.demo.session", "invalid");
		const malformed = new ServerDemoSession(storage, base, () => undefined);
		sessions.push(malformed);
		expect(malformed.getSnapshot().session).toBeNull();
	});

	test("network failure restoring is retryable and keeps the saved session", async () => {
		let fail = true;
		const storage = memory();
		storage.setItem("gridly.demo.session", JSON.stringify(credentials()));
		const session = new ServerDemoSession(
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
			session: { session_id: "first" },
		});
		fail = false;
		await session.restore();
		expect(session.getSnapshot().status).toBe("active");
	});
});

test("unreadable and unremovable saved demo does not break startup", () => {
	const session = new ServerDemoSession(
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
		session: null,
	});
});
