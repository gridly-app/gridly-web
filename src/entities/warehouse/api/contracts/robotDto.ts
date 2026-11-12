import { z } from "zod";
import { robotTaskSchema } from "../../model/warehouse";
import { decimal, identity } from "./resourceFields";

export const robotDto = z.object({
	allowed_actions: z.array(z.string()).optional(),
	blocked_reason: z.string().optional(),
	current_task: robotTaskSchema.optional(),
	return_route: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
	motion_path: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
	...identity,
	name: z.string(),
	x: z.number(),
	y: z.number(),
	specializations: z.array(z.string()).optional(),
	roles: z.array(z.string()).optional(),
	speed_cells_per_tick: z.number().optional(),
	speed: z.number().optional(),
	action_ticks: z.number(),
	capacity_volume: decimal,
	status: z.string(),
});

export type RobotDto = z.infer<typeof robotDto>;
