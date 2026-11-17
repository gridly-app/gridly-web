import type { AuditEvent } from "@/domain/shipment";

const eventLabels: ReadonlyMap<string, { action: string; success?: string }> =
	new Map(
		Object.entries({
			"shipment.document.published": {
				action: "Публикация документа",
				success: "Документ опубликован",
			},
			"shipment.document.unpublished": {
				action: "Снятие документа с публикации",
				success: "Документ снят с публикации",
			},
			"shipment.document.uploaded": {
				action: "Загрузка документа",
				success: "Документ загружен",
			},
			"shipment.document.downloaded": {
				action: "Скачивание документа",
				success: "Документ скачан",
			},
			"shipment.share_link.issued": {
				action: "Выпуск гостевой ссылки",
				success: "Гостевая ссылка выпущена",
			},
			"shipment.share_link.updated": {
				action: "Изменение гостевой ссылки",
				success: "Гостевая ссылка изменена",
			},
			"shipment.share_link.revoked": {
				action: "Отзыв гостевой ссылки",
				success: "Гостевая ссылка отозвана",
			},
			"shipment.updated": {
				action: "Обновление данных отгрузки",
				success: "Данные отгрузки обновлены",
			},
			"shipment.viewed": {
				action: "Просмотр отгрузки",
				success: "Отгрузка просмотрена",
			},
			"account.login": { action: "Вход в аккаунт" },
			"access.denied": { action: "Отказано в доступе" },
			"account.permissions.updated": {
				action: "Изменение прав доступа",
				success: "Обновлены права",
			},
			"order.updated": { action: "Изменение заказа", success: "Заказ изменён" },
			"order.confirmed": {
				action: "Подтверждение заказа",
				success: "Заказ подтверждён",
			},
			"order.cancelled": { action: "Отмена заказа", success: "Заказ отменён" },
			"order.created": { action: "Создание заказа", success: "Заказ создан" },
			"order.deleted": { action: "Удаление заказа", success: "Заказ удалён" },
			"warehouse.map.saved": { action: "Сохранение карты склада" },
			"inbound.confirmed": { action: "Подтверждение поставки" },
			"warehouse.snapshot.updated": { action: "Обновление данных склада" },
			"notification.sent": { action: "Отправка уведомления" },
			"shipment.status.synced": { action: "Передача статуса отгрузки" },
		}),
	);

export function auditEventLabel(event: AuditEvent) {
	if (event.event_label != null) return event.event_label;

	const labels = eventLabels.get(event.event_type);
	const label =
		event.result === "success"
			? (labels?.success ?? labels?.action)
			: labels?.action;

	return label ?? "Операция";
}
