import type { AuditEvent } from "@/domain/shipment";

import { changeValue } from "../../../model/changes/auditChangeValue";

import sharedStyles from "../../../shared.module.css";

export function ValueChange({
	change,
	timeZone,
}: {
	change: AuditEvent["changes"][number];
	timeZone: string | undefined;
}) {
	const before = changeValue(change.field, change.before, timeZone);
	const after = changeValue(change.field, change.after, timeZone);

	return (
		<>
			<dd className={sharedStyles.value}>
				<span className={sharedStyles.changeLabel}>Было:</span> {before}
			</dd>
			<dd className={sharedStyles.value}>
				<span className={sharedStyles.changeLabel}>Стало:</span> {after}
			</dd>
		</>
	);
}
