import type { AuditEvent } from "@/domain/shipment";

import {
	changeLabel,
	changeValue,
	permissionChanges,
} from "../../model/auditChanges";

import factStyles from "../../shared.module.css";
import styles from "./AuditEventChanges.module.css";

export function AuditEventChanges({
	event,
}: {
	event: Pick<AuditEvent, "changes" | "event_type">;
}) {
	return (
		<section className={styles.auditChanges} aria-label="Изменения">
			<h3 className={styles.changesTitle}>Изменения</h3>
			{event.changes.length ? (
				<dl className={styles.changesList}>
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
	);
}

function AuditChange({ change }: { change: AuditEvent["changes"][number] }) {
	const permissions = permissionChanges(change);

	return (
		<div className={styles.change}>
			<dt className={factStyles.label}>{changeLabel(change)}</dt>
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
						<dd className={factStyles.value}>Список прав не изменился.</dd>
					)}
				</>
			) : (
				<>
					<dd className={factStyles.value}>
						<span className={styles.changeLabel}>Было:</span>{" "}
						{changeValue(change.field, change.before)}
					</dd>
					<dd className={factStyles.value}>
						<span className={styles.changeLabel}>Стало:</span>{" "}
						{changeValue(change.field, change.after)}
					</dd>
				</>
			)}
		</div>
	);
}

function PermissionList({ label, items }: { label: string; items: string[] }) {
	return (
		<dd className={factStyles.value}>
			<span className={styles.changeLabel}>{label}:</span>
			{items.length ? (
				<ul className={styles.auditPermissionList}>
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
