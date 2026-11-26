import type { AuditEvent } from "@/domain/shipment";

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

export function changeLabel(change: AuditEvent["changes"][number]) {
	const { field, label } = change;
	const defaultLabel = Object.hasOwn(fieldLabels, field)
		? fieldLabels[field]
		: undefined;

	return label ?? defaultLabel ?? field;
}
