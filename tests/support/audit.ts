import type { AuditEvent } from "@/domain/shipment";

export function auditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
	return {
		id: "event-1",
		occurred_at: "2026-11-19T00:30:00+03:00",
		time_zone: "Europe/Moscow",
		event_type: "order.updated",
		source: "account",
		result: "success",
		actor_id: "actor-4321",
		warehouse_id: "warehouse-7654",
		order_id: "order-9876",
		changes: [],
		correlation_id: "operation-1357",
		...overrides,
	};
}
