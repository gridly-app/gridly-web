import { z } from "zod";

export const sandboxMetadataSchema = z.object({
	access_id: z.string().min(1),
	initial_warehouse_id: z.string().min(1),
});

export const sandboxAccessSchema = sandboxMetadataSchema.extend({
	access_token: z.string().min(1),
});
