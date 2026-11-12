import { z } from "zod";
import { decimal, identity } from "./resourceFields";

export const categoryDto = z.object({
	allowed_actions: z.array(z.string()).optional(),
	product_count: z.number().optional(),
	...identity,
	name: z.string(),
	storage_kind: z.enum(["general", "cold"]),
	archived_at: z.string().nullable().optional(),
	is_archived: z.boolean().optional(),
});

export const productDto = z.object({
	allowed_actions: z.array(z.string()).optional(),
	...identity,
	name: z.string(),
	sku: z.string(),
	category_id: z.string(),
	volume_per_unit: z.string().optional(),
	unit_volume: z.number().optional(),
	price: decimal.nullable(),
	standard_shelf_life_days: z.number().nullable().optional(),
	default_shelf_life_days: z.number().nullable().optional(),
	archived_at: z.string().nullable().optional(),
	is_archived: z.boolean().optional(),
});

export type CategoryDto = z.infer<typeof categoryDto>;
export type ProductDto = z.infer<typeof productDto>;
