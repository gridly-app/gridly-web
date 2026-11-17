import { expect, test } from "bun:test";

import { type AuditEvent, auditEventSchema } from "@/domain/shipment";
import { systemSchema } from "../api/system.dto";
import { systemErrorRows } from "./systemErrors";
import { componentName } from "./systemLabels";

const event = auditEventSchema.parse({
	id: "event-1",
	occurred_at: "2026-11-13T15:00:00+03:00",
	event_type: "constructor",
	source: "constructor",
	result: "failure",
	actor_id: null,
	warehouse_id: "warehouse-1",
	order_id: null,
	changes: [{ field: "constructor", before: null, after: "high" }],
	correlation_id: "operation-1",
});

function describeEvent(event: AuditEvent) {
	return {
		area: event.event_type === "warehouse.map.saved" ? "map" : "orders",
		areaLabel: "Раздел склада",
		event: event.event_type,
		description: "",
		searchFields: [event.event_type],
	};
}

test("system errors keep their identity across refreshes and link only to an unambiguous failure", () => {
	const error = {
		occurred_at: "2026-11-13T12:00:00Z",
		component: "warehouse",
		message: "Ошибка карты",
		correlation_id: event.correlation_id,
		retry_state: null,
	};
	const failure = { ...event, event_type: "warehouse.map.saved" };
	const [before] = systemErrorRows(
		[error],
		[failure],
		"standard",
		describeEvent,
	);
	const [, after] = systemErrorRows(
		[
			{ ...error, message: "Другая ошибка" },
			{ ...error, retry_state: "pending" },
		],
		[failure],
		"standard",
		describeEvent,
	);
	const [ambiguous] = systemErrorRows(
		[error],
		[failure, { ...event, id: "event-2", event_type: "order.updated" }],
		"standard",
		describeEvent,
	);

	expect(before?.sectionUrl).toBe("/warehouses/warehouse-1/map");
	expect(after?.key).toBe(before?.key);
	expect(ambiguous?.sectionUrl).toBeUndefined();
	expect(ambiguous?.events).toHaveLength(2);
});

test("diagnostic error keeps its key when the server ID stays the same", () => {
	const error = {
		id: "error-1",
		occurred_at: "2026-11-13T12:00:00Z",
		component: "warehouse",
		message: "Ошибка карты",
		correlation_id: "operation-1",
		retry_state: null,
	};
	const { recent_errors: errors } = systemSchema.parse({
		checked_at: error.occurred_at,
		components: [],
		error_count: 1,
		recent_errors: [error],
		jobs: [],
	});
	const [before] = systemErrorRows(errors, [], "standard", describeEvent);
	const [after] = systemErrorRows(
		[{ ...error, message: "Ошибка карты повторилась" }],
		[],
		"standard",
		describeEvent,
	);

	expect(before?.key).toBe(after?.key);
});

test("unknown component codes use a readable fallback", () => {
	expect(componentName("constructor")).toBe("Компонент системы");
});
