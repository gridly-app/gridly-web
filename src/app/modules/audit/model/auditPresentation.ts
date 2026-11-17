import { formatMoment } from "@/shared/lib";
import type { AuditEvent } from "@/domain/shipment";

import { auditEventLabel } from "../config/auditEventLabels";
import { auditArea, auditAreaLabels } from "./auditArea";

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

export type AuditRow = {
	event: AuditEvent;
	summary: ReturnType<typeof auditSummary>;
	timestamp: number;
};

const rowByEvent = new WeakMap<AuditEvent, AuditRow>();

export function auditRow(event: AuditEvent): AuditRow {
	const cached = rowByEvent.get(event);

	if (cached) return cached;

	const row = {
		event,
		summary: auditSummary(event),
		timestamp: Date.parse(event.occurred_at),
	};

	rowByEvent.set(event, row);

	return row;
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
