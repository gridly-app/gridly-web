import { expect, test } from "bun:test";

import { permissionChanges } from "./auditPermissionChanges";

test("permission differences require two known string lists", () => {
	const change = { field: "permissions", after: ["read"] };

	for (const before of [null, undefined, "read", ["read", 1]]) {
		expect(permissionChanges({ ...change, before })).toBeUndefined();
	}

	expect(permissionChanges({ ...change, before: [] })?.added).toEqual(["read"]);
	expect(
		permissionChanges({ ...change, before: ["read"], after: null }),
	).toBeUndefined();
});

test("permission differences deduplicate values and include additions and removals", () => {
	const before = ["read", "write", "write"];
	const after = ["read", "export", "export"];

	expect(permissionChanges({ field: "permissions", before, after })).toEqual({
		before: ["read", "write"],
		after: ["read", "export"],
		added: ["export"],
		removed: ["write"],
	});
	expect(before).toEqual(["read", "write", "write"]);
	expect(after).toEqual(["read", "export", "export"]);
});

test("permission reordering does not add or remove rights", () => {
	const change = {
		field: "permissions",
		before: ["read", "write"],
		after: ["write", "read"],
	};

	expect(permissionChanges(change)?.added).toEqual([]);
	expect(permissionChanges(change)?.removed).toEqual([]);
});
