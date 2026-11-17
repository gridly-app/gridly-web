import { z } from "zod";

import type { AuditEvent } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";

const fieldLabels: Record<string, string> = {
	published: "Публикация",
	priority: "Приоритет",
	status_reason: "Причина изменения статуса",
	plan: "План отгрузки",
	actual: "Фактическая отгрузка",
	transport_milestones: "Этапы перевозки",
	expires_at: "Срок действия",
	permissions: "Права доступа",
};

const priorities = new Map([
	["high", "Высокий"],
	["normal", "Обычный"],
	["low", "Низкий"],
]);

export function changeLabel(change: AuditEvent["changes"][number]) {
	const { field, label } = change;
	const defaultLabel = Object.hasOwn(fieldLabels, field)
		? fieldLabels[field]
		: undefined;

	return label ?? defaultLabel ?? field;
}

function permissionList(value: unknown) {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
		return null;

	return [...new Set(value)];
}

export function permissionChanges(change: AuditEvent["changes"][number]) {
	if (change.field !== "permissions") return;

	const before = permissionList(change.before);
	const after = permissionList(change.after);

	if (!before || !after) return;

	const previous = new Set(before);
	const next = new Set(after);

	return {
		before,
		after,
		added: after.filter((item) => !previous.has(item)),
		removed: before.filter((item) => !next.has(item)),
	};
}

const instant = z.iso.datetime({ offset: true });

export function changeValue(field: string, value: unknown): string {
	if (value == null) return "Не указано";

	if (typeof value === "boolean") {
		if (field === "published") return value ? "Опубликован" : "Не опубликован";

		return value ? "Да" : "Нет";
	}

	if (typeof value === "string") {
		if (field === "priority") return priorities.get(value) ?? value;
		if (field === "expires_at" && instant.safeParse(value).success)
			return formatMoment(value);

		return value;
	}

	if (typeof value === "object")
		return JSON.stringify(value, null, 2) ?? "Данные изменены";

	return String(value);
}
