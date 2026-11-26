import { expect, test } from "bun:test";

import { auditEvent } from "../../../../../../tests/support/audit";

import { auditCsv } from "./auditCsv";
import { auditRow } from "../events/auditRow";

test("CSV preserves subject identifiers and original event and source codes without display names", () => {
	const row = auditRow(
		auditEvent({ event_type: "custom.operation", source: "custom-origin" }),
	);
	const csv = auditCsv([row]);

	for (const value of [
		"actor-4321",
		"warehouse-7654",
		"order-9876",
		"custom.operation",
		"custom-origin",
	]) {
		expect(csv).toContain(`"${value}"`);
	}
});

test("CSV changes use the event time zone", () => {
	const row = auditRow(
		auditEvent({
			time_zone: "Pacific/Kiritimati",
			changes: [
				{ field: "expires_at", before: null, after: "2026-11-19T12:30:00Z" },
			],
		}),
	);

	expect(auditCsv([row])).toContain(
		"Срок действия: Не указано → 20.11.2026, 02:30",
	);
});

test("audit export escapes quotes and prefixes cells that could be parsed as formulas", () => {
	const row = auditRow({
		...auditEvent(),
		actor_name: '=SUM("a")',
		changes: [{ field: "published", before: false, after: true }],
	});

	const csv = auditCsv([row]);

	expect(csv).toContain(`"'=SUM(""a"")"`);
	expect(csv).toContain("Публикация: Не опубликован → Опубликован");
});
