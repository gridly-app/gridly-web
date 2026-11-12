import { z } from "zod";
import { identity } from "./resourceFields";
import { policyDto } from "./warehouseDto";

const taskDto = z.object({
	...identity,
	type: z.string(),
	status: z.string(),
	allowed_actions: z.array(z.string()).optional(),
});

export const orderDto = z.object({
	quantity: z.number().optional(),
	stage: z.number().optional(),
	...identity,
	number: z.string().optional(),
	kind: z.enum(["inbound", "outbound"]),
	counterparty_text: z.string(),
	status: z.string(),
	created_at: z.string(),
	confirmations: policyDto.optional(),
	confirm_unload: z.boolean().optional(),
	confirm_pick: z.boolean().optional(),
	confirm_putaway: z.boolean().optional(),
	confirm_load: z.boolean().optional(),
	allowed_actions: z.array(z.string()).optional(),
	blocked_reason: z.string().optional(),
	tasks: z.array(taskDto).optional(),
	lines: z
		.array(
			z.object({
				id: z.string().optional(),
				product_id: z.string(),
				quantity: z.number(),
				expires_on: z.string().nullable().optional(),
				putaway_quantity: z.number().optional(),
				placed_quantity: z.number().optional(),
				written_off_quantity: z.number().optional(),
				lost_quantity: z.number().optional(),
			}),
		)
		.optional(),
});

export type OrderDto = z.infer<typeof orderDto>;
