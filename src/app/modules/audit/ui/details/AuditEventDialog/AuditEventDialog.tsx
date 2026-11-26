import type { AuditEvent } from "@/domain/shipment";
import { managementStyles as styles } from "@/shared/ui/management";
import { Modal } from "@/shared/ui/overlays";

import {
	auditEventFacts,
	auditTechnicalFacts,
} from "../../../model/events/auditEventFacts";
import { AuditEventChanges } from "../AuditEventChanges/AuditEventChanges";
import { AuditFacts } from "../AuditFacts/AuditFacts";

export function AuditEventDialog({
	event,
	onClose,
}: {
	event: AuditEvent;
	onClose: () => void;
}) {
	return (
		<Modal title="Карточка события" onClose={onClose} wide>
			<AuditFacts facts={auditEventFacts(event)} />
			<details>
				<summary className={styles.detailsSummary}>Технические данные</summary>
				<AuditFacts facts={auditTechnicalFacts(event)} isTechnical />
			</details>
			<AuditEventChanges event={event} />
		</Modal>
	);
}
