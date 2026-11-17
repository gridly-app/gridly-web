import { z } from "zod";

export const warehouseSettingsDto = z
	.object({
		revision: z.number().int().nonnegative(),
		location: z.string().max(200),
		low_stock_threshold: z.number().int().nonnegative(),
		allocation_policy: z.literal("fefo"),
	})
	.transform((v) => ({
		revision: v.revision,
		location: v.location,
		lowStockThreshold: v.low_stock_threshold,
		allocationPolicy: v.allocation_policy,
	}));
