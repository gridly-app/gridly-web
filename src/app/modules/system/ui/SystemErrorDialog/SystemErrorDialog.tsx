import type { SystemErrorRow } from "../../model/systemErrors";

import { Skeleton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";

import type { RenderAuditEvents } from "../../model/auditContext";

import { managementStyles as styles } from "@/shared/ui/management";

export function SystemErrorDialog({
	row,
	isLoading,
	hasCompleteContext,
	onClose,
	renderAuditEvents,
}: {
	row: SystemErrorRow;
	isLoading: boolean;
	hasCompleteContext: boolean;
	onClose: () => void;
	renderAuditEvents: RenderAuditEvents;
}) {
	const section =
		hasCompleteContext && row.sectionUrl && row.context
			? { url: row.sectionUrl, area: row.context.area }
			: null;
	const hasEvents = row.events.length > 0;
	const eventsUnavailable = isLoading ? (
		<Skeleton label="Ищем связанные события…" />
	) : (
		<p>Связанные события недоступны.</p>
	);

	return (
		<Modal title="Подробности ошибки" onClose={onClose} wide>
			<p>{row.message}</p>
			{section && (
				<Link className={styles.link} to={section.url}>
					Открыть раздел «{section.area}»
				</Link>
			)}
			{hasEvents && !hasCompleteContext && (
				<p>Показаны события из загруженной части журнала.</p>
			)}
			{hasEvents
				? renderAuditEvents(row.events, "", "Связанные события")
				: eventsUnavailable}
			<details>
				<summary className={styles.detailsSummary}>Технические данные</summary>
				<p>
					ID операции · <code>{row.correlation_id}</code>
				</p>
			</details>
		</Modal>
	);
}
