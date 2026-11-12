import { z } from "zod";

export const eventDto = z.object({
	warehouse_id: z.string().optional(),
	id: z.union([z.string(), z.number()]),
	event_type: z.string().optional(),
	entity_locator: z.string().optional(),
	payload: z.unknown().optional(),
	created_at: z.string(),
	message: z.string().optional(),
	detail: z.string().optional(),
});

export type EventDto = z.infer<typeof eventDto>;
