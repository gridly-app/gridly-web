import type { AuditEvent } from "@/domain/shipment";

import { auditArea, auditAreaLabels } from "./auditArea";
import { auditSearchFields } from "./auditSearchFields";
import { auditSummary } from "./auditSummary";

export function describeAuditEvent(event: AuditEvent) {
	const area = auditArea(event);
	const summary = auditSummary(event);
	const context = [summary.actor, summary.warehouse, summary.order].filter(
		Boolean,
	);

	return {
		area,
		areaLabel: auditAreaLabels[area],
		event: summary.event,
		description: context.join(" · "),
		searchFields: auditSearchFields(event),
	};
}
