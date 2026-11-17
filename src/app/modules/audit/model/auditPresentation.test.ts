import { expect, test } from "bun:test";

import { textSearch } from "@/shared/lib";
import { auditEventSchema } from "@/domain/shipment";
import { auditCsv } from "./auditCsv";
import { auditRow, auditSearchFields, changeValue } from "./auditPresentation";

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

	expect(textSearch("другой источник")(auditSearchFields(row))).toBe(true);
	expect(row.summary.event).toBe("Операция");
	expect(auditCsv([row])).toContain("constructor: Не указано → high");
});

test("audit export escapes quotes and prefixes cells that could be parsed as formulas", () => {
	const row = auditRow({
		...event,
		actor_name: '=SUM("a")',
		changes: [{ field: "published", before: false, after: true }],
	});

	const csv = auditCsv([row]);

	expect(csv).toContain(`"'=SUM(""a"")"`);
	expect(csv).toContain("Публикация: Не опубликован → Опубликован");
	expect(changeValue("expires_at", "2026-11-13Tнеизвестно")).toBe(
		"2026-11-13Tнеизвестно",
	);
	expect(changeValue("priority", "high")).toBe("Высокий");
});

test("finds audit rows by the subject identifiers shown in technical details", () => {
	const row = auditRow({
		...event,
		actor_id: "actor-4321",
		order_id: "order-4321",
	});
	const fields = auditSearchFields(row);

	expect(textSearch("actor-4321")(fields)).toBe(true);
	expect(textSearch("warehouse-1")(fields)).toBe(true);
	expect(textSearch("order-4321")(fields)).toBe(true);
});
