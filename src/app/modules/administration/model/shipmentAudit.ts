import { z } from "zod";

const text = z.string();
const nullableText = text.nullable();
const date = z.iso.datetime({ offset: true });
const event = z.object({
	id: text,
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
export const auditSchema = z.object({
	items: z.array(event),
	total: z.number().int().nonnegative(),
});
export type AuditEvent = z.infer<typeof event>;

export const systemSchema = z.object({
	checked_at: date,
	components: z.array(
		z.object({
			code: text,
			name: text.optional(),
			status: z.enum(["ok", "degraded", "unavailable"]),
			last_success_at: date.nullable(),
			lag_seconds: z.number().nonnegative().nullable(),
		}),
	),
	error_count: z.number().int().nonnegative(),
	recent_errors: z.array(
		z.object({
			occurred_at: date,
			component: text,
			component_name: text.optional(),
			message: text,
			correlation_id: text,
			retry_state: nullableText,
		}),
	),
	jobs: z.array(
		z.object({
			id: text,
			type: text,
			name: text.optional(),
			status: text,
			started_at: date.nullable(),
		}),
	),
	order_diagnostics: z
		.object({
			warehouse_id: text,
			order_id: text,
			order_number: text.optional(),
			warehouse_name: text.optional(),
			time_zone: text.optional(),
			updated_at: date.nullable(),
			recent_events: z.array(event),
		})
		.nullish(),
});

export type SystemError = z.infer<typeof systemSchema>["recent_errors"][number];

export const auditPath = "/admin/shipment-audit";
export const systemPath = "/admin/shipment-system";

export const usersPath = "/admin/shipment-users";

export const warehouseAccess = z.object({
	warehouse_id: text,
	warehouse_name: text,
	permissions: z.array(text),
});
const subject = z.object({ id: text, name: text });
export const accountUserSchema = subject.extend({
	kind: z.literal("account"),
	login: text,
	warehouses: z.array(warehouseAccess),
	revision: z.number().int().nonnegative().optional(),
});
export const accountUserUpdateSchema = accountUserSchema
	.pick({ warehouses: true })
	.extend({
		name: text.trim().min(1).max(120),
		login: text.trim().min(1).max(254),
		revision: z.number().int().nonnegative(),
	});
export type AccountUser = z.infer<typeof accountUserSchema>;
export const usersSchema = z.object({
	permission_catalog: z
		.array(
			z.object({
				code: text,
				label: text,
				group: text,
			}),
		)
		.optional(),
	items: z.array(
		z.discriminatedUnion("kind", [
			accountUserSchema,
			subject.extend({
				kind: z.literal("guest"),
				warehouse_id: text,
				warehouse_name: text,
				order_id: text,
				order_number: text,
				status: z.enum(["active", "expired", "revoked"]),
				expires_at: date,
				time_zone: text.optional(),
			}),
		]),
	),
});
export type AuditUser = z.infer<typeof usersSchema>["items"][number];
