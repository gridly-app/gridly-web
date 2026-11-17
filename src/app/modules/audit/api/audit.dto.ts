import { z } from "zod";

import { auditEventSchema } from "@/domain/shipment";

export const auditSchema = z.object({
	items: z.array(auditEventSchema),
	total: z.number().int().nonnegative(),
});
