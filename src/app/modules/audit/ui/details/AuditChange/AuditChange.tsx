import type { AuditEvent } from "@/domain/shipment";

import { changeLabel } from "../../../model/changes/auditChangeLabel";
import { permissionChanges } from "../../../model/changes/auditPermissionChanges";
import { PermissionChange } from "../PermissionChange/PermissionChange";
import { ValueChange } from "../ValueChange/ValueChange";

import sharedStyles from "../../../shared.module.css";
import styles from "./AuditChange.module.css";

export function AuditChange({
	change,
	timeZone,
}: {
	change: AuditEvent["changes"][number];
	timeZone: string | undefined;
}) {
	const permissions = permissionChanges(change);

	return (
		<div className={styles.change}>
			<dt className={sharedStyles.label}>{changeLabel(change)}</dt>
			{permissions ? (
				<PermissionChange permissions={permissions} />
			) : (
				<ValueChange change={change} timeZone={timeZone} />
			)}
		</div>
	);
}
