import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseCommands } from "@/entities/warehouse/api/commands/restCommands";
import { warehouseKeys } from "@/entities/warehouse/api/queries/queryKeys";
import { RestWarehouseRepository } from "@/entities/warehouse/api/repositories/restRepository";
import { warehouseCommandSchema } from "@/entities/warehouse/model/commands/commandSchemas";
import type { Warehouse } from "@/entities/warehouse/model/warehouse";
import { writeOffFromForm } from "@/pages/inventory/model/writeOffFromForm";
import { robotFromForm } from "@/pages/robots/model/robotFromForm";
import { ApiError, FetchHttpClient, type RequestOptions } from "@/shared/api";
import { warehouse } from "../../support/warehouse";

function form() {
	const data = new FormData();
	for (const [name, value] of Object.entries({
		name: "New",
		roles: "ship",
		speed: "5",
		duration: "20",
		capacity: "2.500",
		position: "1,1",
	}))
		data.append(name, value);
	return data;
}

test("robot wire DTO uses x/y on POST and revision on PATCH", async () => {
	const w = warehouse();
	const calls: { path: string; options: RequestOptions }[] = [];
	const commands = new RestWarehouseCommands(
		{ request: async () => ({}) },
		async (path, options) => {
			calls.push({ path, options });
		},
	);
	await commands.execute(
		"w",
		{ action: "robot", value: robotFromForm(form(), undefined, w.cells) },
		w,
	);
	expect(calls[0]).toMatchObject({
		path: "/warehouses/w/robots",
		options: {
			method: "POST",
			body: { x: 1, y: 1, speed: 5, action_ticks: 20 },
		},
	});
	await commands.execute(
		"w",
		{ action: "robot", value: robotFromForm(form(), w.robots[0], []) },
		w,
	);
	expect(calls[1]).toMatchObject({
		path: "/warehouses/w/robots/r",
		options: { method: "PATCH", body: { revision: 1 } },
	});
	expect(calls[1]?.options.body).not.toHaveProperty("x");
});
test("archive commands use POST and direct stock commands are rejected before sending", async () => {
	const w = warehouse();
	const calls: { path: string; options: RequestOptions }[] = [];
	const commands = new RestWarehouseCommands(
		{ request: async () => ({}) },
		async (path, options) => {
			calls.push({ path, options });
		},
	);
	await commands.execute("w", { action: "archiveProduct", value: "p" }, w);
	await commands.execute("w", { action: "archiveCategory", value: "c" }, w);
	expect(calls.map((c) => [c.path, c.options.method])).toEqual([
		["/warehouses/w/products/p/archive", "POST"],
		["/warehouses/w/categories/c/archive", "POST"],
	]);
	for (const action of [
		"stock",
		"deleteStock",
		"deleteProduct",
		"deleteCategory",
		"cabinet",
	])
		expect(
			warehouseCommandSchema.safeParse({ action, value: "s" }).success,
		).toBe(false);
	const stock = w.stock[0];
	if (!stock) throw new Error("Missing stock");
	const data = new FormData();
	data.set("quantity", "9");
	data.set("reason", "Damage");
	expect(() => writeOffFromForm(data, stock)).toThrow("доступный");
	await expect(
		commands.execute(
			"w",
			{ action: "writeoff", value: { id: "s", quantity: 9, reason: "Damage" } },
			w,
		),
	).rejects.toThrow("доступный");
	data.set("quantity", "2");
	const value = writeOffFromForm(data, stock);
	await commands.execute("w", { action: "writeoff", value }, w);
	expect(calls[2]).toMatchObject({
		path: "/warehouses/w/inventory/write-offs",
		options: {
			method: "POST",
			body: { stock_id: "s", quantity: 2, reason: "Damage" },
		},
	});
});
test("confirm derives action from freshly read kind; 201/202 receipts succeed", async () => {
	for (const kind of ["inbound", "outbound"]) {
		const bodies: unknown[] = [];
		const client = new FetchHttpClient("/api", async (_url, init) => {
			if (init?.method === "POST") {
				bodies.push(JSON.parse(String(init.body)));
				return Response.json({ status: "in_progress" }, { status: 202 });
			}
			return Response.json({
				id: "o",
				number: "N",
				kind,
				status: "waiting",
				counterparty_text: "",
				created_at: "2026-11-10T00:00:00Z",
				revision: 7,
				allowed_actions: ["confirm", "start"],
				lines: [],
			});
		});
		const commands = new RestWarehouseCommands(client, (path, options) =>
			client.request(path, options),
		);
		await commands.execute("w", { action: "confirm", value: "o" }, warehouse());
		expect(bodies[0]).toEqual({
			revision: 7,
			action: kind === "inbound" ? "unload" : "load",
		});
		await commands.execute("w", { action: "start", value: "o" }, warehouse());
		expect(bodies[1]).toEqual({ revision: 7 });
	}
	for (const status of [201, 202]) {
		const client = new FetchHttpClient("/api", async () =>
			Response.json({ accepted: true }, { status }),
		);
		expect(await client.request("/command", { method: "POST" })).toEqual({
			accepted: true,
		});
	}
});
test("settings keep a separate revision, only send changed fields and retain server failures", async () => {
	const cache = new QueryClient();
	cache.setQueryData(warehouseKeys.detail("w"), warehouse());
	const calls: { url: string; body: unknown }[] = [];
	let status = 200;
	let revision = 4;
	let threshold = 10;
	const client = new FetchHttpClient("/api", async (url, options) => {
		if (status !== 200)
			return Response.json(
				{
					error: {
						code: status === 409 ? "STALE_REVISION" : "NOT_FOUND",
						message: "Unavailable",
					},
				},
				{ status },
			);
		const body = options?.body ? JSON.parse(String(options.body)) : undefined;
		calls.push({ url: String(url), body });
		if (body) {
			revision++;
			threshold = body.low_stock_threshold ?? threshold;
		}
		return Response.json({
			revision,
			location: "Москва",
			low_stock_threshold: threshold,
			allocation_policy: "fefo",
		});
	});
	const repo = new RestWarehouseRepository(client, cache);
	expect((await repo.get("w", undefined, "settings")).settings?.revision).toBe(
		4,
	);
	await repo.execute("w", {
		action: "warehouseSettings",
		value: { revision: 4, lowStockThreshold: 12 },
	});
	expect(calls[1]?.body).toEqual({ revision: 4, low_stock_threshold: 12 });
	expect(
		(await repo.get("w", undefined, "settings")).settings?.lowStockThreshold,
	).toBe(12);
	for (const code of [409, 404]) {
		status = code;
		await expect(
			repo.execute("w", {
				action: "warehouseSettings",
				value: { revision: 4, location: "Казань" },
			}),
		).rejects.toBeInstanceOf(ApiError);
		expect(
			cache.getQueryData<Warehouse>(warehouseKeys.detail("w"))?.settings
				?.location,
		).toBe("Москва");
	}
	repo.clear();
	cache.clear();
});
