import { z } from "zod";
import { workflowPolicySchema } from "./workflowPolicy";

export const orderSchema = z.object({
	quantity: z.number().optional(),
	revision: z.number().optional(),
	allowedActions: z.array(z.string()).optional(),
	blockedReason: z.string().optional(),
	tasks: z
		.array(
			z.object({
				id: z.string(),
				revision: z.number().optional(),
				type: z.string(),
				status: z.string(),
				allowed_actions: z.array(z.string()).optional(),
			}),
		)
		.optional(),
	id: z.string(),
	number: z.string(),
	kind: z.union([z.literal("inbound"), z.literal("outbound")]),
	party: z.string(),
	status: z.string(),
	lines: z.array(
		z.object({
			id: z.string().optional(),
			product: z.string(),
			quantity: z.number(),
			expires: z.string(),
			putaway: z.number().optional(),
			writtenOff: z.number().optional(),
		}),
	),
	manual: workflowPolicySchema,
	stage: z.number().optional(),
	created: z.string(),
	reason: z.string().optional(),
});

export type Order = z.infer<typeof orderSchema>;
