import { z } from "zod";

import { formatMoment } from "@/shared/lib";
import type { AuditEvent } from "@/domain/shipment";

const events: Record<string, string> = {
	"shipment.document.published": "Документ опубликован",
	"shipment.document.unpublished": "Документ снят с публикации",
	"shipment.document.uploaded": "Документ загружен",
	"shipment.document.downloaded": "Документ скачан",
	"shipment.share_link.issued": "Гостевая ссылка выпущена",
	"shipment.share_link.updated": "Гостевая ссылка изменена",
	"shipment.share_link.revoked": "Гостевая ссылка отозвана",
	"shipment.updated": "Данные отгрузки обновлены",
	"shipment.viewed": "Отгрузка просмотрена",
	"account.login": "Вход в аккаунт",
	"access.denied": "Отказано в доступе",
	"account.permissions.updated": "Обновлены права",
	"order.updated": "Заказ изменён",
	"order.confirmed": "Заказ подтверждён",
	"order.cancelled": "Заказ отменён",
	"order.created": "Заказ создан",
	"order.deleted": "Заказ удалён",
	"warehouse.map.saved": "Сохранение карты склада",
	"inbound.confirmed": "Подтверждение поставки",
	"warehouse.snapshot.updated": "Обновление данных склада",
	"notification.sent": "Отправка уведомления",
	"shipment.status.synced": "Передача статуса отгрузки",
};

const sources: Record<string, string> = {
	account: "Аккаунт",
	guest: "Гость по ссылке",
	sandbox: "Анонимный доступ",
	system: "Система",
};

const fields: Record<string, string> = {
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

function ownLabel(labels: Record<string, string>, key: string) {
	return Object.hasOwn(labels, key) ? labels[key] : undefined;
}

export function auditSummary(row: AuditEvent) {
	const source = ownLabel(sources, row.source) ?? "Другой источник";

	return {
		date: formatMoment(row.occurred_at, row.time_zone),
		event: row.event_label ?? ownLabel(events, row.event_type) ?? "Операция",
		result: row.result === "success" ? "Успех" : "Отказ",
		actor: row.actor_name ?? (row.actor_id ? "Пользователь" : source),
		warehouse: row.warehouse_name ?? (row.warehouse_id ? "Склад" : ""),
		order: row.order_number ?? (row.order_id ? "Заказ" : ""),
		source,
	};
}

export function changeLabel(change: AuditEvent["changes"][number]) {
	return change.label ?? ownLabel(fields, change.field) ?? change.field;
}

function permissionList(value: unknown) {
	if (value == null) return [];
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

export const auditAreaLabels = {
	inbound: "Поставки",
	outbound: "Отгрузки",
	map: "Карта склада",
	orders: "Заказы",
	access: "Доступ",
	system: "Система",
	unknown: "Раздел не указан",
};

const actionAreas = [
	["shipment.", "outbound"],
	["outbound.", "outbound"],
	["inbound.", "inbound"],
	["warehouse.map.", "map"],
	["map.", "map"],
	["order.", "orders"],
	["access.", "access"],
	["account.", "access"],
] as const;

export function auditArea(event: AuditEvent): keyof typeof auditAreaLabels {
	if (event.area) return event.area;

	const match = actionAreas.find(([prefix]) =>
		event.event_type.startsWith(prefix),
	);

	if (match) return match[1];

	return event.source === "system" ? "system" : "unknown";
}

export function auditRow(event: AuditEvent) {
	return {
		event,
		summary: auditSummary(event),
		timestamp: Date.parse(event.occurred_at),
	};
}

export type AuditRow = ReturnType<typeof auditRow>;

export function auditSearchFields({ event, summary }: AuditRow) {
	return [
		...Object.values(summary),
		event.id,
		event.correlation_id,
		event.event_type,
		event.actor_id ?? "",
		event.warehouse_id ?? "",
		event.order_id ?? "",
		...event.changes.flatMap((change) => [
			changeLabel(change),
			changeValue(change.field, change.before),
			changeValue(change.field, change.after),
		]),
	];
}

export function describeAuditEvent(event: AuditEvent) {
	const area = auditArea(event);
	const areaLabel = auditAreaLabels[area];
	const summary = auditSummary(event);
	const context = [summary.actor, summary.warehouse, summary.order];

	return {
		area,
		areaLabel,
		event: summary.event,
		description: context.filter(Boolean).join(" · "),
		searchFields: [areaLabel, ...Object.values(summary)],
	};
}
