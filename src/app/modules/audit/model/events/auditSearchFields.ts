import type { AuditEvent } from "@/domain/shipment";

import { auditArea, auditAreaLabels } from "./auditArea";
import { changeLabel } from "../changes/auditChangeLabel";
import { changeValue } from "../changes/auditChangeValue";
import { auditSummary } from "./auditSummary";

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
