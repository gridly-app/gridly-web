import { z } from "zod";

export const guestSections = {
	warehouse: "Готовность на складе",
	milestones: "Этапы заказа",
	calendar: "План и факт отгрузок",
	items: "Номенклатура",
	documents: "Документы",
};

export const guestSectionSchema = z.enum([
	"warehouse",
	"milestones",
	"calendar",
	"items",
	"documents",
] satisfies (keyof typeof guestSections)[]);
export type GuestSection = z.infer<typeof guestSectionSchema>;

export const issuedLinkSchema = z.object({
	id: z.string().optional(),
	url: z.url({ protocol: /^https?$/ }),
	expires_at: z.iso.datetime({ offset: true }),
});
