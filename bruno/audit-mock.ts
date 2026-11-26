import type { AuditEvent } from "../src/domain/shipment";

import { auditArea } from "../src/app/modules/audit/model/events/auditArea";
import { auditCsv } from "../src/app/modules/audit/model/export/auditCsv";
import {
	auditRow,
	auditSearchFields,
} from "../src/app/modules/audit/model/auditPresentation";
import { createTextIndex, textSearchQuery } from "../src/shared/lib";

const exactFilters = [
	"warehouse_id",
	"order_id",
	"actor_id",
	"event_type",
	"result",
	"correlation_id",
] as const;
type Cursor = [timestamp: number, id: string];

function position(event: AuditEvent): Cursor {
	return [Date.parse(event.occurred_at), event.id];
}

function compare([timeA, idA]: Cursor, [timeB, idB]: Cursor) {
	return timeB - timeA || idB.localeCompare(idA);
}

export function mockAudit(
	items: AuditEvent[],
	params: URLSearchParams,
	filename: string | undefined,
	headers: HeadersInit,
) {
	const q = textSearchQuery(params.get("q") ?? "");
	const from = params.get("from");
	const to = params.get("to");
	const start = from ? Date.parse(from) : -Infinity;
	const end = to ? Date.parse(to) : Infinity;
	const area = params.get("area");
	const filtered = items.filter((event) => {
		const [timestamp] = position(event);

		return (
			timestamp >= start &&
			timestamp < end &&
			exactFilters.every(
				(key) => !params.has(key) || params.get(key) === event[key],
			) &&
			(!area || area === auditArea(event)) &&
			(!q || q(createTextIndex(auditSearchFields(event))))
		);
	});

	filtered.sort((a, b) => compare(position(a), position(b)));

	if (filename) {
		const responseHeaders = new Headers(headers);

		responseHeaders.set("Content-Type", "text/csv; charset=utf-8");
		responseHeaders.set(
			"Content-Disposition",
			`attachment; filename=${filename}`,
		);

		return new Response(`\uFEFF${auditCsv(filtered.map(auditRow))}`, {
			headers: responseHeaders,
		});
	}

	const cursor = params.get("cursor");
	let remaining = filtered;

	if (cursor) {
		try {
			const decoded: unknown = JSON.parse(
				Buffer.from(cursor, "base64url").toString(),
			);

			if (
				!Array.isArray(decoded) ||
				typeof decoded[0] !== "number" ||
				typeof decoded[1] !== "string"
			) {
				throw new Error("Invalid cursor");
			}

			const boundary: Cursor = [decoded[0], decoded[1]];

			remaining = filtered.filter(
				(event) => compare(position(event), boundary) > 0,
			);
		} catch {
			return Response.json(
				{ error: { code: "INVALID_CURSOR" } },
				{ status: 422, headers },
			);
		}
	}

	const limit = Math.min(200, Math.max(1, Number(params.get("limit")) || 50));
	const page = remaining.slice(0, limit);
	const last = page.at(-1);
	const nextCursor =
		last && remaining.length > limit
			? Buffer.from(JSON.stringify(position(last))).toString("base64url")
			: null;

	return Response.json(
		{ items: page, total: filtered.length, next_cursor: nextCursor },
		{ headers },
	);
}
