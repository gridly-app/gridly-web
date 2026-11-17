import { formatMoment } from "@/domain/shipment";
import type { AuditEvent } from "./shipmentAudit";

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

export function adminMoment(
	value: string | null,
	timeZone?: string | undefined,
) {
	try {
		return formatMoment(value, timeZone);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;
		return formatMoment(value);
	}
}

export function adminDateKey(value: string, timeZone?: string | undefined) {
	const options = {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	} as const;
	try {
		return new Intl.DateTimeFormat("sv-SE", { ...options, timeZone }).format(
			new Date(value),
		);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;
		return new Intl.DateTimeFormat("sv-SE", options).format(new Date(value));
	}
}

export function auditSummary(row: AuditEvent) {
	const source = sources[row.source] ?? "Другой источник";
	return {
		date: adminMoment(row.occurred_at, row.time_zone),
		event: row.event_label ?? events[row.event_type] ?? "Операция",
		result: row.result === "success" ? "Успех" : "Отказ",
		actor: row.actor_name ?? (row.actor_id ? "Пользователь" : source),
		warehouse: row.warehouse_name ?? (row.warehouse_id ? "Склад" : ""),
		order: row.order_number ?? (row.order_id ? "Заказ" : ""),
		source,
	};
}

export function changeLabel(change: AuditEvent["changes"][number]) {
	return change.label ?? fields[change.field] ?? change.field;
}

export function permissionChanges(change: AuditEvent["changes"][number]) {
	if (change.field !== "permissions") return;
	const toList = (value: unknown) =>
		value == null
			? []
			: Array.isArray(value) && value.every((item) => typeof item === "string")
				? [...new Set<string>(value)]
				: null;
	const before = toList(change.before);
	const after = toList(change.after);
	if (!before || !after) return;
	return {
		before,
		after,
		added: after.filter((item) => !before.includes(item)),
		removed: before.filter((item) => !after.includes(item)),
	};
}

export function changeValue(value: unknown): string {
	if (value == null) return "Не указано";
	if (typeof value === "boolean") return value ? "Да" : "Нет";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:/.test(value)) return adminMoment(value);
		return (
			(
				{ high: "Высокий", normal: "Обычный", low: "Низкий" } as Record<
					string,
					string
				>
			)[value] ?? value
		);
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

export function auditArea(event: AuditEvent): keyof typeof auditAreaLabels {
	if (event.area) return event.area;
	const type = event.event_type;
	if (type.startsWith("shipment.") || type.startsWith("outbound."))
		return "outbound";
	if (type.startsWith("inbound.")) return "inbound";
	if (type.startsWith("warehouse.map.") || type.startsWith("map."))
		return "map";
	if (type.startsWith("order.")) return "orders";
	if (type.startsWith("access.") || type.startsWith("account."))
		return "access";
	if (event.source === "system") return "system";
	return "unknown";
}
