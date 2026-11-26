import { expect, test } from "bun:test";

import { changeValue } from "./auditChangeValue";

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
