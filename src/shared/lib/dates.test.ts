import { expect, test } from "bun:test";

import { dateRangeError } from "./dates";

test("date filters reject unsupported years and reversed ranges", () => {
	expect(dateRangeError("10000-01-01", "")).toBe(
		"Введите даты в допустимом диапазоне.",
	);
	expect(dateRangeError("2026-11-14", "2026-11-13")).toBe(
		"Дата окончания должна быть не раньше даты начала.",
	);
	expect(dateRangeError("2026-11-13", "2026-11-13")).toBeNull();
});
