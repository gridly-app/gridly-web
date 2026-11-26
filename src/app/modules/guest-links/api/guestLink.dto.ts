import { z } from "zod";

import { guestSectionSchema, issuedLinkSchema } from "@/domain/shipment";

const text = z.string();
const instant = z.iso.datetime({ offset: true });

export const guestLinkNameMaxLength = 120;

export const guestLinkInputSchema = z.object({
	name: text.trim().min(1).max(guestLinkNameMaxLength),
	expires_at: instant,
	order_ids: z
		.array(text.min(1))
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length),
	sections: z
		.array(guestSectionSchema)
		.refine((sections) => new Set(sections).size === sections.length),
});

export const guestLinkSchema = z.object({
	name: text,
	expires_at: instant,
	order_ids: z.array(text.min(1)),
	sections: z.array(guestSectionSchema),
	id: text.min(1),
	origin: z.enum(["operator", "admin"]).optional(),
	revision: z.number().int().nonnegative(),
	status: z.enum(["active", "expired", "revoked"]),
	created_at: instant.optional(),
	url: z.url({ protocol: /^https?$/ }).optional(),
});

export const guestLinksSchema = z.object({
	items: z.array(guestLinkSchema.omit({ url: true })).refine((items) => {
		const ids = new Set(items.map(({ id }) => id));

		return ids.size === items.length;
	}, "Идентификаторы гостевых ссылок должны быть уникальны."),
});

export const createdGuestLinkSchema = guestLinkSchema.extend({
	url: issuedLinkSchema.shape.url,
});

export type GuestLinkInput = z.infer<typeof guestLinkInputSchema>;
export type GuestLink = z.infer<typeof guestLinkSchema>;
export type GuestLinkList = z.infer<typeof guestLinksSchema>;
export type CreatedGuestLink = z.infer<typeof createdGuestLinkSchema>;
