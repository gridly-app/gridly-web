import { expect, test } from "bun:test";

import { auditEventSchema } from "@/domain/shipment";

import { auditCsv } from "../export/auditCsv";
import { defaultAuditFilters, filterAuditRows } from "../filters/auditFilters";
import { auditRow } from "./auditRow";

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

test("unknown API labels remain strings when searching and exporting audit events", () => {
	const row = auditRow(event);

	expect(
		filterAuditRows([row], {
			...defaultAuditFilters,
			search: "другой источник",
		}),
	).toEqual([row]);
	expect(row.summary.event).toBe("Операция");
	expect(auditCsv([row])).toContain("constructor: Не указано → high");
});

test("finds audit rows by the subject identifiers shown in technical details", () => {
	const row = auditRow({
		...event,
		actor_id: "actor-4321",
		order_id: "order-4321",
	});

	for (const search of ["actor-4321", "warehouse-1", "order-4321"]) {
		expect(filterAuditRows([row], { ...defaultAuditFilters, search })).toEqual([
			row,
		]);
	}
});

test("failed commands use their action name and preserve an explicit API label", () => {
	const failed = { ...event, event_type: "shipment.document.published" };

	expect(auditRow(failed).summary.event).toBe("Публикация документа");
	expect(auditRow({ ...failed, result: "success" }).summary.event).toBe(
		"Документ опубликован",
	);
	expect(
		auditRow({ ...failed, event_label: "Ошибка загрузки" }).summary.event,
	).toBe("Ошибка загрузки");
});

test("row labels and sort timestamp stay consistent with the current event", () => {
	const current = { ...event };
	const original = auditRow(current);

	current.actor_name = "Updated actor";
	current.occurred_at = "2026-11-20T12:00:00Z";

	const updated = auditRow(current);

	expect(updated.summary.actor).toBe("Updated actor");
	expect(updated.timestamp).toBe(1795176000000);
	expect(original.summary.actor).toBe("Updated actor");
	expect(original.timestamp).toBe(1795176000000);
});
