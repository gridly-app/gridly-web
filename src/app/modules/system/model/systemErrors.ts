import { warehousePath } from "@/ports/navigation";
import type { WorkspaceMode } from "@/ports/session";

import { createTextIndex, formatMoment } from "@/shared/lib";
import type { DescribeAuditEvent } from "./auditContext";
import type { AuditEvent } from "@/domain/shipment";
import type { SystemError } from "../api/system.dto";
import { componentName } from "./systemLabels";

const areaPages = new Map([
	["inbound", "inbound"],
	["outbound", "outbound"],
	["map", "map"],
]);

export function systemErrorRows(
	items: SystemError[],
	events: AuditEvent[],
	mode: WorkspaceMode,
	describeEvent: DescribeAuditEvent,
) {
	const byOperation = new Map<string, AuditEvent[]>();
	const uniqueEvents = new Map(events.map((event) => [event.id, event]));

	for (const event of uniqueEvents.values()) {
		if (!event.correlation_id) continue;
		const related = byOperation.get(event.correlation_id) ?? [];
		related.push(event);
		byOperation.set(event.correlation_id, related);
	}

	const occurrences = new Map<string, number>();

	return items.map((error) => {
		const timestamp = Date.parse(error.occurred_at);
		const events = byOperation.get(error.correlation_id) ?? [];
		const failures = events.filter(
			(entry) =>
				entry.result === "failure" &&
				Date.parse(entry.occurred_at) === timestamp,
		);
		const event = failures.length === 1 ? failures[0] : undefined;
		const details = event ? describeEvent(event) : undefined;
		const page = details && areaPages.get(details.area);
		const context = details && {
			area: details.areaLabel,
			event: details.event,
			description: details.description,
		};
		const sectionUrl =
			page && event?.warehouse_id
				? warehousePath(mode, event.warehouse_id, page)
				: undefined;
		const identity = error.id
			? JSON.stringify(["id", error.id])
			: JSON.stringify([
					"legacy",
					error.correlation_id,
					timestamp,
					error.component,
					error.message,
				]);
		const occurrence = occurrences.get(identity) ?? 0;
		occurrences.set(identity, occurrence + 1);

		return {
			...error,
			timestamp,
			key: JSON.stringify([identity, occurrence]),
			componentLabel: error.component_name ?? componentName(error.component),
			events,
			context,
			sectionUrl,
		};
	});
}

export type SystemErrorRow = ReturnType<typeof systemErrorRows>[number];

export function systemErrorSearchIndexes(
	rows: SystemErrorRow[],
	describeEvent: DescribeAuditEvent,
) {
	const eventFields = new Map<string, string[]>();

	function fieldsForEvent(event: AuditEvent) {
		const cached = eventFields.get(event.id);

		if (cached) return cached;

		const fields = describeEvent(event).searchFields;
		eventFields.set(event.id, fields);

		return fields;
	}

	return rows.map((row) => ({
		row,
		index: createTextIndex([
			row.componentLabel,
			row.message,
			row.correlation_id,
			row.retry_state ?? "",
			formatMoment(row.occurred_at),
			...row.events.flatMap(fieldsForEvent),
		]),
	}));
}
