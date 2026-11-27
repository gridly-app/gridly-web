import { z } from "zod";
import {
	documentSchema,
	shipmentSchema,
	shipmentTrackingSchema,
} from "@/domain/shipment";

export const workingShipmentSchema = shipmentSchema.extend({
	route: shipmentTrackingSchema.shape.route,
	allowed_actions: z.array(z.string()).default([]),
	revision: z.number().int().nonnegative(),
	share_link: z
		.object({
			id: z.string().optional(),
			origin: z.literal("operator").optional(),
			expires_at: z.iso.datetime({ offset: true }),
		})
		.nullable(),
	documents: z.array(
		documentSchema.extend({
			published: z.boolean(),
			chain_id: z.string().min(1).optional(),
			is_latest: z.boolean().optional(),
			upload_request_id: z.uuid().optional(),
		}),
	),
});

export type WorkingShipment = z.infer<typeof workingShipmentSchema>;
