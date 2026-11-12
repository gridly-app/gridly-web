import { z } from "zod";

export const reportViewSchema = z.object({
	name: z.string().min(1).max(80),
	from: z.iso.date(),
	to: z.iso.date(),
	kind: z.string(),
	status: z.string(),
	category: z.string(),
	compare: z.boolean(),
});

export const cabinetSchema = z.object({
	reportViews: z.array(reportViewSchema).optional(),
	location: z.string().max(200),
	placement: z.enum(["fifo", "fefo"]),
	allowMixedCategories: z.boolean(),
	reserveOnStart: z.boolean(),
	lowStockThreshold: z.number().int().nonnegative(),
});

export const warehouseSettingsSchema = z.object({
	revision: z.number().int().nonnegative(),
	location: z.string().max(200),
	lowStockThreshold: z.number().int().nonnegative(),
	allocationPolicy: z.literal("fefo"),
});
export type WarehouseSettings = z.infer<typeof warehouseSettingsSchema>;
