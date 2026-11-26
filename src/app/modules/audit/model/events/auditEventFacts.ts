import type { AuditEvent } from "@/domain/shipment";

import { auditArea, auditAreaLabels } from "./auditArea";
import { auditSummary } from "./auditSummary";

export type AuditFact = {
	label: string;
	value: string;
	dateTime?: string;
};

export function auditEventFacts(event: AuditEvent): AuditFact[] {
	const summary = auditSummary(event);

	return [
		{ label: "Событие", value: summary.event },
		{ label: "Раздел", value: auditAreaLabels[auditArea(event)] },
		{ label: "Кто", value: summary.actor },
		{ label: "Источник", value: summary.source },
		{ label: "Когда", value: summary.date, dateTime: event.occurred_at },
		{ label: "Результат", value: summary.result },
		{ label: "Склад", value: summary.warehouse || "Нет склада" },
		{ label: "Заказ", value: summary.order || "Нет заказа" },
	];
}

export function auditTechnicalFacts(event: AuditEvent): AuditFact[] {
	const relatedFacts = [
		{ label: "ID пользователя", value: event.actor_id },
		{ label: "ID склада", value: event.warehouse_id },
		{ label: "ID заказа", value: event.order_id },
	].filter((fact): fact is AuditFact => Boolean(fact.value));

	return [
		{ label: "ID события", value: event.id },
		{ label: "ID операции", value: event.correlation_id },
		{ label: "Тип события", value: event.event_type },
		...relatedFacts,
	];
}
