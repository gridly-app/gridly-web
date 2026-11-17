import { z } from "zod";

import { auditEventSchema } from "@/domain/shipment";

const text = z.string();
const date = z.iso.datetime({ offset: true });

export const systemSchema = z.object({
	checked_at: date,
	components: z
		.array(
			z.object({
				code: text.min(1),
				name: text.optional(),
				status: z.enum(["ok", "degraded", "unavailable"]),
				last_success_at: date.nullable(),
				lag_seconds: z.number().nonnegative().nullable(),
			}),
		)
		.refine(
			(items) => new Set(items.map(({ code }) => code)).size === items.length,
		),
	error_count: z.number().int().nonnegative(),
	recent_errors: z.array(
		z.object({
			id: text.min(1).optional(),
			occurred_at: date,
			component: text,
			component_name: text.optional(),
			message: text,
			correlation_id: text.min(1),
			retry_state: text.nullable(),
		}),
	),
	jobs: z
		.array(
			z.object({
				id: text.min(1),
				type: text,
				name: text.optional(),
				status: text,
				started_at: date.nullable(),
			}),
		)
		.refine(
			(items) => new Set(items.map(({ id }) => id)).size === items.length,
		),
	order_diagnostics: z
		.object({
			warehouse_id: text.min(1),
			order_id: text.min(1),
			order_number: text.optional(),
			warehouse_name: text.optional(),
			time_zone: text.optional(),
			updated_at: date.nullable(),
			recent_events: z.array(auditEventSchema),
		})
		.nullish(),
});

export type SystemStatus = z.infer<typeof systemSchema>;
export type SystemError = SystemStatus["recent_errors"][number];
