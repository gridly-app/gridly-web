import { expect, test } from "bun:test";

import { warehouse } from "../../../../../../tests/support/warehouse";
import type { RequestOptions } from "@/shared/http";
import { RestWarehouseCommands } from "./restCommands";

test.each([
	{ kind: "inbound", extra: { expires_on: "2026-12-01" } },
	{ kind: "outbound", extra: {} },
] as const)(
	"creates an $kind order with the correct wire fields",
	async ({ kind, extra }) => {
		const snapshot = warehouse();
		const writes: { path: string; options: RequestOptions }[] = [];
		const commands = new RestWarehouseCommands(
			{ request: async () => ({}) },
			async (path, options) => {
				writes.push({ path, options });

				return {};
			},
		);

		await commands.execute(
			"w",
			{
				action: "order",
				value: {
					kind,
					party: "  Counterparty  ",
					lines: [{ product: "p", quantity: 2, expires: "2026-12-01" }],
					manual: { ...snapshot.policy, confirmLoad: true },
				},
			},
			snapshot,
			{},
		);

		expect(writes).toEqual([
			{
				path: "/warehouses/w/orders",
				options: {
					method: "POST",
					body: {
						kind,
						counterparty_text: "Counterparty",
						lines: [{ product_id: "p", quantity: 2, ...extra }],
						confirm_unload: false,
						confirm_pick: false,
						confirm_putaway: false,
						confirm_load: true,
					},
				},
			},
		]);
	},
);

test("a task whose permission was revoked is rejected before any write", async () => {
	const reads: string[] = [];
	const writes: string[] = [];
	const commands = new RestWarehouseCommands(
		{
			request: async (path) => {
				reads.push(path);

				return {
					id: "order",
					number: "A-1",
					kind: "inbound",
					status: "waiting",
					counterparty_text: "Supplier",
					created_at: "2026-11-12T00:00:00Z",
					revision: 1,
					lines: [],
					allowed_actions: [],
					tasks: [
						{
							id: "task",
							revision: 8,
							type: "unload",
							status: "waiting",
							allowed_actions: [],
						},
					],
				};
			},
		},
		async (path) => writes.push(path),
	);

	await expect(
		commands.execute(
			"w",
			{
				action: "taskAction",
				value: { id: "task", orderId: "order", action: "confirm", revision: 7 },
			},
			warehouse(),
			{},
		),
	).rejects.toThrow("Подтверждение задачи недоступно");

	expect(reads).toEqual(["/warehouses/w/orders/order"]);
	expect(writes).toEqual([]);
});

test("editing an order sends its displayed revision and preserves existing line IDs", async () => {
	const snapshot = warehouse();
	const writes: { path: string; options: RequestOptions }[] = [];
	const commands = new RestWarehouseCommands(
		{ request: async () => ({}) },
		async (path, options) => {
			writes.push({ path, options });

			return {};
		},
	);

	await commands.execute(
		"w",
		{
			action: "order",
			value: {
				id: "order/1",
				revision: 7,
				kind: "inbound",
				party: "Supplier",
				lines: [
					{ id: "existing", product: "p", quantity: 2, expires: "" },
					{ product: "new", quantity: 4, expires: "2026-12-01" },
				],
				manual: snapshot.policy,
			},
		},
		snapshot,
		{},
	);

	expect(writes).toMatchObject([
		{
			path: "/warehouses/w/orders/order%2F1",
			options: {
				method: "PATCH",
				body: {
					revision: 7,
					lines: [
						{ id: "existing", product_id: "p", quantity: 2, expires_on: null },
						{ product_id: "new", quantity: 4, expires_on: "2026-12-01" },
					],
				},
			},
		},
	]);
	expect(writes[0]?.options.body).not.toHaveProperty("kind");
	expect(writes[0]?.options.body).not.toHaveProperty("lines.1.id");
});
