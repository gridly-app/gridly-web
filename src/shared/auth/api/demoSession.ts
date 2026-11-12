import { z } from "zod";

export const demoMetadataSchema = z.object({
	session_id: z.string().min(1),
	expires_at: z.iso.datetime({ offset: true }),
	initial_warehouse_id: z.string().min(1),
});

export const demoSessionSchema = demoMetadataSchema.extend({
	access_token: z.string().min(1),
});
