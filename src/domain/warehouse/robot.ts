import { z } from "zod";
import { gridPositionSchema } from "./layout/layout";

export const robotTaskSchema = z.object({
	id: z.string().optional(),
	allocationIndex: z.number().int().nonnegative().optional(),
	shelfKey: z.string().optional(),
	deliveryRoute: z.array(gridPositionSchema).optional(),
	orderId: z.string(),
	productId: z.string(),
	lineIndex: z.number(),
	quantity: z.number(),
	phase: z.union([z.literal("pickup"), z.literal("delivery")]),
	label: z.string(),
	destination: gridPositionSchema,
	target: gridPositionSchema,
	route: z.array(gridPositionSchema),
	actionTicks: z.number(),
	carrying: z.boolean(),
});

export const robotSchema = z.object({
	allowedActions: z.array(z.string()).optional(),
	blockedReason: z.string().optional(),
	motionPath: z.array(gridPositionSchema).optional(),
	motionTimed: z.boolean().optional(),
	currentTask: robotTaskSchema.optional(),
	returnRoute: z.array(gridPositionSchema).optional(),
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	roles: z.array(z.string()),
	x: z.number(),
	y: z.number(),
	speed: z.number(),
	duration: z.number(),
	capacity: z.string(),
	status: z.string(),
});

export type RobotTask = z.infer<typeof robotTaskSchema>;
export type Robot = z.infer<typeof robotSchema>;
