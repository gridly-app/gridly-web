import {
	auditArea,
	auditAreaLabels,
	auditSummary,
	changeLabel,
	changeValue,
	permissionChanges,
} from "../../model/auditPresentation";
import type { AuditEvent } from "@/domain/shipment";

import { Modal } from "@/shared/ui/overlays";

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
			<dl className={auditEventsStyles.auditEventDetails}>
				{facts.map(({ label, value }) => (
					<div key={label} className={auditEventsStyles.fact}>
						<dt className={auditEventsStyles.label}>{label}</dt>
						<dd className={auditEventsStyles.value}>{value}</dd>
					</div>
				))}
			</dl>
			<details>
				<summary className={styles.detailsSummary}>Технические данные</summary>
				<dl
					className={`${auditEventsStyles.auditEventDetails} ${auditEventsStyles.technicalDetails}`}
				>
					{technicalDetails.map(({ label, value }) => (
						<div key={label} className={auditEventsStyles.fact}>
							<dt className={auditEventsStyles.label}>{label}</dt>
							<dd className={auditEventsStyles.value}>
								<code>{value}</code>
							</dd>
						</div>
					))}
				</dl>
			</details>
			<section
				className={auditEventsStyles.auditChanges}
				aria-label="Изменения"
			>
				<h3 className={auditEventsStyles.changesTitle}>Изменения</h3>
				{event.changes.length ? (
					<dl className={auditEventsStyles.changesList}>
						{event.changes.map((change, index) => (
							<AuditChange key={index} change={change} />
						))}
					</dl>
				) : (
					<p>
						{event.event_type === "account.permissions.updated"
							? "Сведения о прежних и новых правах отсутствуют в записи."
							: "В записи нет изменений полей."}
					</p>
				)}
			</section>
		</Modal>
	);
}

function AuditChange({ change }: { change: AuditEvent["changes"][number] }) {
	const permissions = permissionChanges(change);

	return (
		<div className={auditEventsStyles.change}>
			<dt className={auditEventsStyles.label}>{changeLabel(change)}</dt>
			{permissions ? (
				<>
					<PermissionList label="Было" items={permissions.before} />
					<PermissionList label="Стало" items={permissions.after} />
					{permissions.added.length > 0 && (
						<PermissionList label="Добавлены права" items={permissions.added} />
					)}
					{permissions.removed.length > 0 && (
						<PermissionList label="Удалены права" items={permissions.removed} />
					)}
					{!permissions.added.length && !permissions.removed.length && (
						<dd className={auditEventsStyles.value}>
							Список прав не изменился.
						</dd>
					)}
				</>
			) : (
				<>
					<dd className={auditEventsStyles.value}>
						<span className={auditEventsStyles.changeLabel}>Было:</span>{" "}
						{changeValue(change.field, change.before)}
					</dd>
					<dd className={auditEventsStyles.value}>
						<span className={auditEventsStyles.changeLabel}>Стало:</span>{" "}
						{changeValue(change.field, change.after)}
					</dd>
				</>
			)}
		</div>
	);
}

function PermissionList({ label, items }: { label: string; items: string[] }) {
	return (
		<dd className={auditEventsStyles.value}>
			<span className={auditEventsStyles.changeLabel}>{label}:</span>
			{items.length ? (
				<ul className={auditEventsStyles.auditPermissionList}>
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : (
				" Нет прав"
			)}
		</dd>
	);
}
