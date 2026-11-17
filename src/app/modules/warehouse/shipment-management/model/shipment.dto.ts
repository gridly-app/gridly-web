import { z } from "zod";
import { documentSchema, shipmentSchema } from "@/domain/shipment";

export const workingShipmentSchema = shipmentSchema.extend({
	route: z
		.object({
			origin_address: z.string().nullable().optional(),
			destination_address: z.string().nullable().optional(),
		})
		.nullish(),
	revision: z.number().int().nonnegative(),
	share_link: z
		.object({ expires_at: z.iso.datetime({ offset: true }) })
		.nullable(),
	documents: z.array(documentSchema.extend({ published: z.boolean() })),
});

export type WorkingShipment = z.infer<typeof workingShipmentSchema>;
