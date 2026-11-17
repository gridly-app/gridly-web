import { z } from "zod";

const text = z.string();
const nullableText = text.nullable();
const date = z.iso.datetime({ offset: true });

export const auditEventSchema = z.object({
	id: text.min(1),
	occurred_at: date,
	event_type: text,
	event_label: text.optional(),
	area: z
		.enum(["inbound", "outbound", "map", "orders", "access", "system"])
		.optional(),
	result: z.enum(["success", "failure"]),
	actor_id: nullableText,
	actor_name: nullableText.optional(),
	source: text,
	warehouse_id: nullableText,
	warehouse_name: nullableText.optional(),
	time_zone: text.optional(),
	order_id: nullableText,
	order_number: nullableText.optional(),
	changes: z.array(
		z.object({
			field: text,
			label: text.optional(),
			before: z.unknown(),
			after: z.unknown(),
		}),
	),
	correlation_id: text,
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
