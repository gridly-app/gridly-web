import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { auditEvent } from "../../../../../../../tests/support/audit";
import { AuditEventChanges } from "./AuditEventChanges";

test("event details display expiration changes in the event time zone", () => {
	const event = auditEvent({
		time_zone: "Pacific/Kiritimati",
		changes: [
			{
				field: "expires_at",
				before: "2026-11-18T12:30:00Z",
				after: "2026-11-19T12:30:00Z",
			},
		],
	});
	const html = renderToStaticMarkup(<AuditEventChanges event={event} />);

	expect(html).toContain("19.11.2026, 02:30");
	expect(html).toContain("20.11.2026, 02:30");
});
