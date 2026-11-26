import { z } from "zod";

import { formatMoment } from "@/shared/lib";

const priorities = new Map([
	["high", "Высокий"],
	["normal", "Обычный"],
	["low", "Низкий"],
]);

const instant = z.iso.datetime({ offset: true });

export function changeValue(
	field: string,
	value: unknown,
	timeZone?: string,
): string {
	if (value == null) return "Не указано";

	if (typeof value === "boolean") {
		if (field === "published") return value ? "Опубликован" : "Не опубликован";

		return value ? "Да" : "Нет";
	}

	if (typeof value === "string") {
		const isExpiration =
			field === "expires_at" && instant.safeParse(value).success;

		if (field === "priority") return priorities.get(value) ?? value;

		if (isExpiration) return formatMoment(value, timeZone);

		return value;
	}

	if (typeof value === "object")
		return JSON.stringify(value, null, 2) ?? "Данные изменены";

	return String(value);
}
