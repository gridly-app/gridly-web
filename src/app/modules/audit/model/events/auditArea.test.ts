import { expect, test } from "bun:test";

import { auditEvent } from "../../../../../../tests/support/audit";
import { auditArea } from "./auditArea";

test("explicit API area overrides the event prefix and system source", () => {
	expect(
		auditArea(
			auditEvent({
				area: "access",
				event_type: "shipment.updated",
				source: "system",
			}),
		),
	).toBe("access");
});

test.each([
	["shipment.updated", "outbound"],
	["outbound.confirmed", "outbound"],
	["inbound.confirmed", "inbound"],
	["warehouse.map.saved", "map"],
	["map.saved", "map"],
	["order.created", "orders"],
	["access.denied", "access"],
	["account.login", "access"],
] as const)("classifies %s in %s", (event_type, expected) => {
	expect(auditArea(auditEvent({ event_type }))).toBe(expected);
});

test("unknown events use the system area only for a system source", () => {
	expect(
		auditArea(auditEvent({ event_type: "custom.action", source: "system" })),
	).toBe("system");
	expect(auditArea(auditEvent({ event_type: "custom.action" }))).toBe(
		"unknown",
	);
});
