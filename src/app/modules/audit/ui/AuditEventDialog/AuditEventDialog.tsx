import type { ReactNode } from "react";

import { auditArea, auditAreaLabels } from "../../model/auditArea";
import { auditSummary } from "../../model/auditPresentation";
import { AuditEventChanges } from "../AuditEventChanges/AuditEventChanges";
import type { AuditEvent } from "@/domain/shipment";

import { Modal } from "@/shared/ui/overlays";

import factStyles from "../../shared.module.css";
import auditEventsStyles from "./AuditEventDialog.module.css";
import { managementStyles as styles } from "@/shared/ui/management";

export function AuditEventDialog({
	event,
	onClose,
}: {
	event: AuditEvent;
	onClose: () => void;
}) {
	const summary = auditSummary(event);
	const facts = [
		{ label: "Событие", value: summary.event },
		{ label: "Раздел", value: auditAreaLabels[auditArea(event)] },
		{ label: "Кто", value: summary.actor },
		{ label: "Источник", value: summary.source },
		{
			label: "Когда",
			value: <time dateTime={event.occurred_at}>{summary.date}</time>,
		},
		{ label: "Результат", value: summary.result },
		{ label: "Склад", value: summary.warehouse || "Нет склада" },
		{ label: "Заказ", value: summary.order || "Нет заказа" },
	];
	const technicalFacts = [
		{ label: "ID события", value: event.id },
		{ label: "ID операции", value: event.correlation_id },
		{ label: "Тип события", value: event.event_type },
	];
	const relatedFacts = [
		{ label: "ID пользователя", value: event.actor_id },
		{ label: "ID склада", value: event.warehouse_id },
		{ label: "ID заказа", value: event.order_id },
	].filter(({ value }) => Boolean(value));

	const technicalDetails = [...technicalFacts, ...relatedFacts];

	return (
		<Modal title="Карточка события" onClose={onClose} wide>
			<AuditFacts facts={facts} />
			<details>
				<summary className={styles.detailsSummary}>Технические данные</summary>
				<AuditFacts facts={technicalDetails} technical />
			</details>
			<AuditEventChanges event={event} />
		</Modal>
	);
}

function AuditFacts({
	facts,
	technical = false,
}: {
	facts: { label: string; value: ReactNode }[];
	technical?: boolean;
}) {
	const className = technical
		? `${auditEventsStyles.auditEventDetails} ${auditEventsStyles.technicalDetails}`
		: auditEventsStyles.auditEventDetails;

	return (
		<dl className={className}>
			{facts.map(({ label, value }) => (
				<div key={label} className={auditEventsStyles.fact}>
					<dt className={factStyles.label}>{label}</dt>
					<dd className={factStyles.value}>
						{technical ? <code>{value}</code> : value}
					</dd>
				</div>
			))}
		</dl>
	);
}
