import type { AuditEvent } from "@/domain/shipment";

import { type AuditSummary, auditSummary } from "./auditSummary";

export type AuditRow = Readonly<{
	event: AuditEvent;
	summary: AuditSummary;
	timestamp: number;
}>;

export function auditRow(event: AuditEvent): AuditRow {
	return {
		event,

		get summary() {
			return auditSummary(event);
		},

		get timestamp() {
			return Date.parse(event.occurred_at);
		},
	};
}
