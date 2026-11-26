import { expect, test } from "bun:test";

import {
	dateKey,
	dateRangeError,
	formatMoment,
	parseUtcDateTimeInput,
	toUtcDateTimeInput,
} from "./dates";

test("date filters reject unsupported years and reversed ranges", () => {
	expect(dateRangeError("10000-01-01", "")).toBe(
		"Введите даты в допустимом диапазоне.",
	);
	expect(dateRangeError("2026-11-14", "2026-11-13")).toBe(
		"Дата окончания должна быть не раньше даты начала.",
	);
	expect(dateRangeError("2026-11-13", "2026-11-13")).toBeNull();
});

test("formats the local calendar day and tolerates an invalid display zone", () => {
	expect(dateKey("2026-11-01T21:00:00Z", "Europe/Moscow")).toBe("2026-11-02");
	expect(dateKey("2026-11-01T21:00:00Z", "invalid/zone")).toBe("2026-11-01");
	expect(dateKey("not a date", "UTC")).toBeNull();
	expect(formatMoment(null, "UTC")).toBe("Не указано");
	expect(formatMoment("not a date", "UTC")).toBe("not a date");
});

test("accepts timestamps as well as ISO strings", () => {
	const timestamp = Date.parse("2026-11-01T21:00:00Z");

	expect(dateKey(timestamp, "Europe/Moscow")).toBe("2026-11-02");
	expect(dateKey(Number.NaN, "UTC")).toBeNull();
	expect(formatMoment(timestamp, "UTC")).toBe(
		formatMoment("2026-11-01T21:00:00Z", "UTC"),
	);
});

test("converts UTC form values without accepting nonexistent calendar dates", () => {
	expect(toUtcDateTimeInput("2026-11-01T21:26:45+03:00", "minute")).toBe(
		"2026-11-01T18:26",
	);
	expect(toUtcDateTimeInput("2026-11-01T21:26:45+03:00")).toBe(
		"2026-11-01T18:26:45",
	);
	expect(toUtcDateTimeInput(null)).toBe("");
	expect(toUtcDateTimeInput("broken")).toBe("");
	expect(parseUtcDateTimeInput("2024-02-29T10:00")).toBe(
		"2024-02-29T10:00:00.000Z",
	);
	expect(parseUtcDateTimeInput("2024-02-29T10:00:01")).toBe(
		"2024-02-29T10:00:01.000Z",
	);
	expect(parseUtcDateTimeInput("2025-02-29T10:00")).toBeNull();
});
