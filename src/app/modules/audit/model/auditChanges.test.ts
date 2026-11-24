import { expect, test } from "bun:test";

import { changeLabel, changeValue, permissionChanges } from "./auditChanges";

test("change labels preserve API labels and do not read inherited object properties", () => {
	expect(
		changeLabel({
			field: "published",
			label: "Custom",
			before: null,
			after: true,
		}),
	).toBe("Custom");
	expect(changeLabel({ field: "constructor", before: null, after: null })).toBe(
		"constructor",
	);
});

test.each([
	["priority", "high", "Высокий"],
	["priority", "custom", "custom"],
	["published", true, "Опубликован"],
	["published", false, "Не опубликован"],
	["other", false, "Нет"],
	["other", null, "Не указано"],
	["expires_at", "2026-11-13Tнеизвестно", "2026-11-13Tнеизвестно"],
])("formats %s value %j as %s", (field, value, expected) => {
	expect(changeValue(field, value)).toBe(expected);
});

test("expiration formatting uses the supplied time zone", () => {
	expect(
		changeValue("expires_at", "2026-11-19T12:30:00Z", "Pacific/Kiritimati"),
	).toBe("20.11.2026, 02:30");
	expect(
		changeValue("expires_at", "2026-11-19T12:30:00Z", "America/Los_Angeles"),
	).toBe("19.11.2026, 04:30");
});

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
