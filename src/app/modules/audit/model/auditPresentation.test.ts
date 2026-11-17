import { expect, test } from "bun:test";

import { auditEventSchema } from "@/domain/shipment";
import { auditCsv } from "./auditCsv";
import { changeValue, permissionChanges } from "./auditChanges";
import { defaultAuditFilters, filterAuditRows } from "./auditFilters";
import { auditRow } from "./auditPresentation";

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

test("only computes permission differences when both lists are known", () => {
	const change = { field: "permissions", after: ["read"] };

	expect(permissionChanges({ ...change, before: null })).toBeUndefined();
	expect(permissionChanges({ ...change, before: [] })?.added).toEqual(["read"]);
});
