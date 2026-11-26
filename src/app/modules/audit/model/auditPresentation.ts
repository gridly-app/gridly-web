import { formatMoment } from "@/shared/lib";
import type { AuditEvent } from "@/domain/shipment";

import { auditEventLabel } from "../config/auditEventLabels";
import { auditArea, auditAreaLabels } from "./events/auditArea";
import { changeLabel, changeValue } from "./auditChanges";

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

export type AuditRow = Readonly<{
	event: AuditEvent;
	summary: Readonly<ReturnType<typeof auditSummary>>;
	timestamp: number;
}>;

export function auditRow(event: AuditEvent): AuditRow {
	return {
		event,

		get summary() {
			return auditSummary(event);
		},

		get timestamp() {
			return Date.parse(event.occurred_at);
		},
	};
}

export function auditSearchFields(event: AuditEvent) {
	const summary = auditSummary(event);
	const areaLabel = auditAreaLabels[auditArea(event)];

	return [
		areaLabel,
		summary.date,
		summary.event,
		summary.result,
		summary.actor,
		summary.warehouse,
		summary.order,
		summary.source,
		event.id,
		event.correlation_id,
		event.event_type,
		event.source,
		event.actor_id ?? "",
		event.warehouse_id ?? "",
		event.order_id ?? "",
		...event.changes.flatMap((change) => [
			changeLabel(change),
			changeValue(change.field, change.before, event.time_zone),
			changeValue(change.field, change.after, event.time_zone),
		]),
	];
}

export function describeAuditEvent(event: AuditEvent) {
	const area = auditArea(event);
	const areaLabel = auditAreaLabels[area];
	const summary = auditSummary(event);
	const context = [summary.actor, summary.warehouse, summary.order].filter(
		Boolean,
	);

	return {
		area,
		areaLabel,
		event: summary.event,
		description: context.join(" · "),
		searchFields: auditSearchFields(event),
	};
}
