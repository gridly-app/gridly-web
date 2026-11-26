import { expect, test } from "bun:test";

import { textSearch } from "@/shared/lib";

import { auditEvent } from "../../../../../../tests/support/audit";

import { describeAuditEvent } from "../events/auditDescription";
import { defaultAuditFilters, filterAuditRows } from "./auditFilters";
import { auditRow } from "../events/auditRow";

test("date filters include both boundaries in the event time zone", () => {
	const rows = [
		auditRow(auditEvent({ id: "before", occurred_at: "2026-11-18T20:59:59Z" })),
		auditRow(auditEvent({ id: "start", occurred_at: "2026-11-18T21:00:00Z" })),
		auditRow(auditEvent({ id: "end", occurred_at: "2026-11-19T20:59:59Z" })),
		auditRow(auditEvent({ id: "after", occurred_at: "2026-11-19T21:00:00Z" })),
	];
	const filtered = filterAuditRows(rows, {
		...defaultAuditFilters,
		from: "2026-11-19",
		to: "2026-11-19",
	});

	expect(filtered.map(({ event }) => event.id)).toEqual(["start", "end"]);
});

test("search and date filters do not reuse results from a previous version of an event", () => {
	const event = auditEvent({
		actor_id: "alpha",
		occurred_at: "2026-11-19T12:00:00Z",
	});
	const row = auditRow(event);
	const filters = {
		...defaultAuditFilters,
		search: "alpha",
		from: "2026-11-19",
		to: "2026-11-19",
	};

	expect(filterAuditRows([row], filters)).toEqual([row]);

	event.actor_id = "zulu";
	event.occurred_at = "2026-11-20T12:00:00Z";

	expect(filterAuditRows([row], filters)).toEqual([]);
	expect(
		filterAuditRows([row], { ...defaultAuditFilters, search: "zulu" }),
	).toEqual([row]);
});

test("audit and diagnostics search share identifiers, area, raw codes and formatted changes", () => {
	const event = auditEvent({
		source: "custom-origin",
		changes: [
			{ field: "status_reason", before: null, after: "missingmanifest" },
		],
	});
	const row = auditRow(event);
	const fields = describeAuditEvent(event).searchFields;

	for (const search of [
		"actor-4321",
		"warehouse-7654",
		"order-9876",
		"Заказы",
		"custom-origin",
		"missingmanifest",
	]) {
		expect(filterAuditRows([row], { ...defaultAuditFilters, search })).toEqual([
			row,
		]);
		expect(textSearch(search)(fields)).toBe(true);
	}

	expect(
		filterAuditRows([row], {
			...defaultAuditFilters,
			search: "nonexistent-2468",
		}),
	).toEqual([]);
});

test("result filters exclude events with a different outcome", () => {
	const rows = [
		auditRow(auditEvent()),
		auditRow(auditEvent({ id: "failed", result: "failure" })),
	];

	expect(
		filterAuditRows(rows, { ...defaultAuditFilters, result: "failure" }).map(
			({ event }) => event.id,
		),
	).toEqual(["failed"]);
});
