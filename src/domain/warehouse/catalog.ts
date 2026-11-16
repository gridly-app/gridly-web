import { z } from "zod";

export const categorySchema = z.object({
	allowedActions: z.array(z.string()).optional(),
	productCount: z.number().optional(),
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	cold: z.boolean(),
	archived: z.boolean().optional(),
});

export const productSchema = z.object({
	allowedActions: z.array(z.string()).optional(),
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	sku: z.string(),
	category: z.string(),
	volume: z.string(),
	price: z.string(),
	shelf: z.number(),
	archived: z.boolean().optional(),
});

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
