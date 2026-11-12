import { z } from "zod";
import { identity } from "./resourceFields";

export const stockDto = z.object({
	available_quantity: z.number().optional(),
	write_off_blocked_reason: z.string().optional(),
	is_expired: z.boolean().optional(),
	can_write_off: z.boolean().optional(),
	...identity,
	batch_id: z.string(),
	product_id: z.string(),
	quantity: z.number(),
	reserved_quantity: z.number().optional(),
	expires_on: z.string().nullable(),
	cell_id: z.string().optional(),
	cell_x: z.number().optional(),
	cell_y: z.number().optional(),
	robot_id: z.string().optional(),
});

export type StockDto = z.infer<typeof stockDto>;
