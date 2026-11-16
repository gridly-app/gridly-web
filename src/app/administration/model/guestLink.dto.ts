import { z } from "zod";
import { guestSectionSchema, issuedLinkSchema } from "@/domain/shipment";

const text = z.string();
const instant = z.iso.datetime({ offset: true });

export const guestLinkInputSchema = z.object({
	name: text.trim().min(1).max(120),
	expires_at: instant,
	order_ids: z
		.array(text.min(1))
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length),
	sections: z
		.array(guestSectionSchema)
		.refine((sections) => new Set(sections).size === sections.length),
});
export const guestLinkSchema = guestLinkInputSchema.extend({
	id: text,
	revision: z.number().int().nonnegative(),
	status: z.enum(["active", "expired", "revoked"]),
	created_at: instant.optional(),
	url: z.url({ protocol: /^https?$/ }).optional(),
});
export const guestLinksSchema = z.object({ items: z.array(guestLinkSchema) });
export const createdGuestLinkSchema = guestLinkSchema.extend(
	issuedLinkSchema.shape,
);
export type GuestLink = z.infer<typeof guestLinkSchema>;

export function guestLinksPath(
	mode: "standard" | "sandbox",
	warehouseId: string,
) {
	return `${mode === "sandbox" ? "/sandbox" : ""}/admin/warehouses/${encodeURIComponent(warehouseId)}/shipment-links`;
}
