import { z } from "zod";

import { guestSectionSchema, shipmentSchema } from "@/domain/shipment";

export const guestShipmentSchema = shipmentSchema
	.partial({
		warehouse: true,
		items: true,
		plan: true,
		actual: true,
		milestones: true,
		documents: true,
	})
	.extend({
		id: z.string(),
		sections: z.array(guestSectionSchema),
		calendar_items: z
			.array(
				shipmentSchema.shape.items.element.pick({
					order_line_id: true,
					name: true,
					sku: true,
				}),
			)
			.optional(),
	});

export type GuestShipment = z.infer<typeof guestShipmentSchema>;

export const guestShipmentsSchema = z.union([
	z.object({ orders: z.array(guestShipmentSchema) }),
	shipmentSchema.transform((shipment) => ({
		orders: [
			{
				...shipment,
				id: shipment.order.number,
				sections: guestSectionSchema.options,
			},
		],
	})),
]);

export type GuestShipments = z.infer<typeof guestShipmentsSchema>;
