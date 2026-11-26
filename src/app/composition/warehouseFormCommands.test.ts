import { expect, test } from "bun:test";
import { writeOffFromForm } from "@/app/modules/warehouse/warehouse-inventory/model/writeOffFromForm";
import { robotFromForm } from "@/app/modules/warehouse/warehouse-robots/model/robotFromForm";
import { RestWarehouseCommands } from "@/app/modules/warehouse-data/api/commands/restCommands";
import { warehouseCommandSchema } from "@/domain/warehouse/commands/commandSchemas";
import { type RequestOptions } from "@/shared/http";
import { warehouse } from "../../../tests/support/warehouse";

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
		{ map: w, robots: w },
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
		{ map: w, robots: w },
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
	await commands.execute("w", { action: "archiveProduct", value: "p" }, w, {
		catalog: w,
	});
	await commands.execute("w", { action: "archiveCategory", value: "c" }, w, {
		catalog: w,
	});
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
			{ inventory: w },
		),
	).rejects.toThrow("доступный");
	data.set("quantity", "2");
	const value = writeOffFromForm(data, stock);
	await commands.execute("w", { action: "writeoff", value }, w, {
		inventory: w,
	});
	expect(calls[2]).toMatchObject({
		path: "/warehouses/w/inventory/write-offs",
		options: {
			method: "POST",
			body: { stock_id: "s", quantity: 2, reason: "Damage" },
		},
	});
});
