import type { AuditEvent } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";

import { auditEventLabel } from "../../config/auditEventLabels";

const sourceLabels: Record<string, string> = {
	account: "Аккаунт",
	guest: "Гость по ссылке",
	sandbox: "Анонимный доступ",
	system: "Система",
};

function ownLabel(labels: Record<string, string>, key: string) {
	return Object.hasOwn(labels, key) ? labels[key] : undefined;
}

export function auditSummary(event: AuditEvent) {
	const isSuccess = event.result === "success";
	const source = ownLabel(sourceLabels, event.source) ?? "Другой источник";

	return {
		date: formatMoment(event.occurred_at, event.time_zone),
		event: auditEventLabel(event),
		result: isSuccess ? "Успех" : "Отказ",
		actor: event.actor_name ?? (event.actor_id ? "Пользователь" : source),
		warehouse: event.warehouse_name ?? (event.warehouse_id ? "Склад" : ""),
		order: event.order_number ?? (event.order_id ? "Заказ" : ""),
		source,
	};
}

export type AuditSummary = Readonly<ReturnType<typeof auditSummary>>;
