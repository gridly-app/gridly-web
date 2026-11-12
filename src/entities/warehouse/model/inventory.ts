import { z } from "zod";

export const stockSchema = z.object({
	availableQuantity: z.number().optional(),
	writeOffBlockedReason: z.string().optional(),
	isExpired: z.boolean().optional(),
	canWriteOff: z.boolean().optional(),
	revision: z.number().optional(),
	batchId: z.string().optional(),
	cellId: z.string().optional(),
	id: z.string(),
	product: z.string(),
	quantity: z.number(),
	reserved: z.number().optional(),
	expires: z.string(),
	cell: z.string(),
});

export const writeOffSchema = z.object({
	id: z.string(),
	product: z.string(),
	quantity: z.number(),
	time: z.string(),
	reason: z.string(),
	price: z.number().nullable(),
});

export type Stock = z.infer<typeof stockSchema>;
