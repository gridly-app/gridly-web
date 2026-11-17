import { expect, test } from "bun:test";

import { usersSchema } from "./users.dto";

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
