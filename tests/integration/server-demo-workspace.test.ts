import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseRepository } from "@/entities/warehouse";
import { ServerDemoSession } from "@/shared/auth/model/ServerDemoSession";

const base = "http://gridly-demo.test/api/v1";
const sessions: ServerDemoSession[] = [];

afterEach(() => {
	for (const session of sessions.splice(0)) session.end();
});

function serverWorkspace(empty = false) {
	const calls: Request[] = [];
	const storage = new Map<string, string>();
	const cache = new QueryClient();
	const warehouse = {
		id: "server-warehouse",
		name: "Server warehouse",
		width: 2,
		height: 2,
		time_zone: "Europe/Moscow",
		published_version: 1,
		revision: 3,
		simulation_mode: "running",
		worker_health: "healthy",
		tick: "8",
		state_version: "8",
		workflow_policy: {
			confirm_unload: false,
			confirm_pick: true,
			confirm_putaway: false,
			confirm_load: true,
		},
	};
	const resources: Record<string, unknown[]> = {
		robots: [
			{
				id: "r",
				name: "Server robot",
				x: 0,
				y: 0,
				status: "moving",
				roles: ["ship"],
				speed: 1,
				action_ticks: 1,
				capacity_volume: "10",
			},
		],
		categories: [{ id: "c", name: "Server category", storage_kind: "general" }],
		products: [
			{
				id: "p",
				name: "Server product",
				sku: "SERVER",
				category_id: "c",
				unit_volume: 1,
				price: "20",
				default_shelf_life_days: null,
			},
		],
		orders: [
			{
				id: "o",
				number: "SERVER-1",
				kind: "outbound",
				counterparty_text: "Server customer",
				status: "created",
				created_at: "2026-10-29T08:00:00Z",
				lines: [{ product_id: "p", quantity: 2 }],
			},
		],
		inventory: [
			{
				id: "s",
				batch_id: "b",
				product_id: "p",
				quantity: 5,
				reserved_quantity: 2,
				expires_on: null,
				cell_x: 0,
				cell_y: 0,
			},
		],
		events: [
			{ id: "e", created_at: "2026-10-29T08:00:00Z", message: "Server event" },
		],
	};
	let failure: { path: string; response: () => Response } | undefined;
	let repository: RestWarehouseRepository;
	const session = new ServerDemoSession(
		{
			getItem: (key) => storage.get(key) ?? null,
			setItem: (key, value) => {
				storage.set(key, value);
			},
			removeItem: (key) => {
				storage.delete(key);
			},
		},
		base,
		() => {
			cache.clear();
			repository.clear();
		},
		async (url, options) => {
			const request = new Request(url, options);
			calls.push(request);
			const path = new URL(request.url).pathname.replace("/api/v1", "");
			expect(options?.credentials).toBe("omit");
			if (path === "/demo/sessions") {
				expect(request.method).toBe("POST");
				expect(request.headers.get("Authorization")).toBeNull();
				expect(await request.text()).toBe("");
				expect(request.headers.get("Idempotency-Key")).toBeTruthy();
				if (failure?.path === path) return failure.response();
				return Response.json({
					session_id: "server-session",
					access_token: "server-token",
					expires_at: new Date(Date.now() + 3600000).toISOString(),
					initial_warehouse_id: warehouse.id,
				});
			}
			expect(request.headers.get("Authorization")).toBe("Bearer server-token");
			if (path === "/demo/session" && request.method === "DELETE")
				return new Response(null, { status: 204 });
			if (failure?.path === path) return failure.response();
			if (path === "/warehouses")
				return Response.json({
					items: empty ? [] : [warehouse],
					total: empty ? 0 : 1,
				});
			if (path === `/warehouses/${warehouse.id}`) {
				if (request.method === "PATCH") {
					expect(request.headers.get("Idempotency-Key")).toBeTruthy();
					const body = (await request.json()) as {
						name: string;
						revision: number;
					};
					expect(body).toEqual({ name: "Renamed on server", revision: 3 });
					warehouse.name = body.name;
					warehouse.revision++;
					return new Response(null, { status: 204 });
				}
				return Response.json(warehouse);
			}
			if (path.endsWith("/layout/draft"))
				return Response.json(
					{ error: { message: "No draft" } },
					{ status: 404 },
				);
			if (path.endsWith("/layout"))
				return Response.json({
					version: 1,
					width: 2,
					height: 2,
					cells: empty
						? []
						: [{ x: 0, y: 0, kind: "storage_general", capacity_volume: "10" }],
				});
			if (path.endsWith("/map/state"))
				return Response.json({
					warehouse_id: warehouse.id,
					layout_version: 1,
					state_version: "8",
					tick: "8",
					robots: empty ? [] : [{ id: "r", x: 1, y: 0, status: "moving" }],
				});
			const resource = resources[path.split("/").at(-1) ?? ""];
			if (resource)
				return Response.json({
					items: empty ? [] : resource,
					total: empty ? 0 : resource.length,
				});
			throw new Error(`Unexpected request: ${request.method} ${path}`);
		},
	);
	repository = new RestWarehouseRepository(session.http, cache);
	sessions.push(session);
	return {
		session,
		repository,
		calls,
		fail: (path: string, response: () => Response) => {
			failure = { path, response };
		},
	};
}

describe("server demo workspace", () => {
	test("loads server resources with demo auth and reads mutations back from the server", async () => {
		const { session, repository, calls } = serverWorkspace();
		await session.start();
		const id = session.getSnapshot().session?.initial_warehouse_id;
		expect(id).toBe("server-warehouse");
		if (!id) throw new Error("Missing initial warehouse ID");
		expect((await repository.list()).map((w) => w.id)).toEqual([id]);
		const snapshot = await repository.get(id as string);
		expect(snapshot.cells[0]).toMatchObject({ type: "storage", capacity: 10 });
		expect(snapshot.robots[0]).toMatchObject({ id: "r", x: 1, y: 0 });
		expect(snapshot.categories[0]?.name).toBe("Server category");
		expect(snapshot.products[0]?.sku).toBe("SERVER");
		expect(snapshot.orders[0]?.number).toBe("SERVER-1");
		expect(snapshot.stock[0]?.quantity).toBe(5);
		expect(snapshot.events[0]?.title).toBe("Server event");
		expect(
			await repository.execute(snapshot.id, {
				action: "settings",
				value: { section: "name", name: "Renamed on server" },
			}),
		).toEqual({ id: snapshot.id, applied: true });
		expect(snapshot.name).toBe("Server warehouse");
		const updated = await repository.get(snapshot.id, undefined, "metadata");
		expect(updated.name).toBe("Renamed on server");
		expect(updated.revision).toBe(4);
		expect(calls.some((request) => request.method === "PATCH")).toBe(true);
	});

	test("preserves empty server collections and sparse layouts without demo seeds", async () => {
		const { session, repository } = serverWorkspace(true);
		await session.start();
		expect(await repository.list()).toEqual([]);
		const snapshot = await repository.get("server-warehouse");
		for (const field of [
			"robots",
			"categories",
			"products",
			"orders",
			"stock",
			"events",
		] as const)
			expect(snapshot[field]).toEqual([]);
		expect(snapshot.cells.map((cell) => cell.type)).toEqual([
			"empty",
			"empty",
			"empty",
			"empty",
		]);
	});

	test("creation failures never activate a local demo", async () => {
		const { session, fail } = serverWorkspace();
		fail("/demo/sessions", () =>
			Response.json(
				{ error: { message: "Demo unavailable" } },
				{ status: 503 },
			),
		);
		await expect(session.start()).rejects.toThrow("Demo unavailable");
		expect(session.getSnapshot()).toMatchObject({
			status: "error",
			session: null,
		});
	});

	test("resource errors and malformed responses reject instead of supplying demo data", async () => {
		for (const response of [
			() =>
				Response.json({ error: { message: "Unavailable" } }, { status: 503 }),
			() => Response.error(),
			() => Response.json({ items: [{ id: "invalid-product" }], total: 1 }),
		]) {
			const { session, repository, fail } = serverWorkspace();
			await session.start();
			fail("/warehouses/server-warehouse/products", response);
			await expect(repository.get("server-warehouse")).rejects.toThrow();
		}
	});

	test("failed mutations do not change the cached snapshot or report success", async () => {
		const { session, repository, fail } = serverWorkspace();
		await session.start();
		const snapshot = await repository.get("server-warehouse");
		fail("/warehouses/server-warehouse", () =>
			Response.json({ error: { message: "Conflict" } }, { status: 409 }),
		);
		await expect(
			repository.execute(snapshot.id, {
				action: "settings",
				value: { section: "name", name: "Renamed on server" },
			}),
		).rejects.toHaveProperty("status", 409);
		expect(snapshot.name).toBe("Server warehouse");
	});

	test("an empty live response preserves the last server state", async () => {
		const { session, repository, fail } = serverWorkspace();
		await session.start();
		const snapshot = await repository.get("server-warehouse");
		fail(
			"/warehouses/server-warehouse/map/state",
			() => new Response(null, { status: 204 }),
		);
		const live = await repository.getLive(snapshot.id);
		expect(live.robots).toEqual(snapshot.robots);
		expect(live.stateVersion).toBe("8");
		expect(live.tick).toBe("8");
	});
});
