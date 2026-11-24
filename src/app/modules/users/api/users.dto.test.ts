import { expect, test } from "bun:test";

import { userRowKey, usersSchema } from "./users.dto";

test("rejects duplicate permission codes across groups", () => {
	const permission = {
		code: "warehouse.view",
		label: "Просмотр",
		group: "Склад",
	};
	const catalog = [permission, { ...permission, group: "Общее" }];
	const result = usersSchema.safeParse({
		items: [],
		permission_catalog: catalog,
	});

	expect(result.success).toBe(false);
});

test("one guest link has a distinct stable row per order", () => {
	const guest = {
		kind: "guest",
		id: "link",
		name: "Гость",
		warehouse_id: "w",
		warehouse_name: "Склад",
		order_id: "one",
		order_number: "O-1",
		status: "active",
		expires_at: "2026-12-01T00:00:00Z",
	};
	const result = usersSchema.parse({
		items: [guest, { ...guest, order_id: "two" }],
	});

	expect(result.items.map(userRowKey)).toEqual([
		'["guest","link","w","one"]',
		'["guest","link","w","two"]',
	]);
	expect(usersSchema.safeParse({ items: [guest, guest] }).success).toBe(false);
});
