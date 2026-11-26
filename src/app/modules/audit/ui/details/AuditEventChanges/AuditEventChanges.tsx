import type { AuditEvent } from "@/domain/shipment";

import { AuditChange } from "../AuditChange/AuditChange";

import styles from "./AuditEventChanges.module.css";

export function AuditEventChanges({
	event,
}: {
	event: Pick<AuditEvent, "changes" | "event_type" | "time_zone">;
}) {
	const isPermissionUpdate = event.event_type === "account.permissions.updated";

	return (
		<section className={styles.auditChanges} aria-label="Изменения">
			<h3 className={styles.changesTitle}>Изменения</h3>
			{event.changes.length ? (
				<dl className={styles.changesList}>
					{event.changes.map((change, index) => (
						<AuditChange
							key={index}
							change={change}
							timeZone={event.time_zone}
						/>
					))}
				</dl>
			) : (
				<p>
					{isPermissionUpdate
						? "Сведения о прежних и новых правах отсутствуют в записи."
						: "В записи нет изменений полей."}
				</p>
			)}
		</section>
	);
}
