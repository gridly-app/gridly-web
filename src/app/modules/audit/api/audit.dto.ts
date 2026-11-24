import { z } from "zod";

import { auditEventSchema } from "@/domain/shipment";

export const auditCollectionSchema = z.object({
	items: z.array(auditEventSchema),
	total: z.number().int().nonnegative(),
});

export const auditSchema = auditCollectionSchema.extend({
	next_cursor: z.string().min(1).nullable(),
});

export type AuditPage = z.infer<typeof auditSchema>;
