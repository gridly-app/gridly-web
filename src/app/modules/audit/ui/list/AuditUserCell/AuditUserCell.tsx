import { adminLocation } from "@/ports/navigation";
import { managementStyles as styles } from "@/shared/ui/management";
import { Link } from "@/shared/ui/navigation";

import type { AuditRow } from "../../../model/events/auditRow";
import { auditUserSelection } from "../../../model/filters/auditUserSelection";

export function AuditUserCell({ event, summary }: AuditRow) {
	if (!event.actor_id) return summary.actor;

	const userLocation = adminLocation(
		"users",
		auditUserSelection(event.actor_id, event.source),
	);

	return (
		<>
			<Link className={styles.link} to={userLocation}>
				{summary.actor}
			</Link>
			<small className={styles.subtle}>{summary.source}</small>
		</>
	);
}
