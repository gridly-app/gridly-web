import { z } from "zod";

export const eventSchema = z.object({
	warehouseId: z.string().optional(),
	type: z.string().optional(),
	entity: z.string().optional(),
	id: z.string(),
	time: z.string(),
	title: z.string(),
	detail: z.string(),
});

export type Event = z.infer<typeof eventSchema>;
