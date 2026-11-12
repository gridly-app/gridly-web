import { z } from "zod";

import { counter } from "./resourceFields";

const stateCounter = counter.transform(String);
const coord = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
});
export const statePatchDto = z.object({
	warehouse_id: z.string(),
	tick: stateCounter,
	state_version: stateCounter,
	committed_at: z.iso.datetime({ offset: true }),
	layout_version: z.number().int().nonnegative().optional(),
	robots: z
		.array(
			z.object({
				robot_id: z.string(),
				from: coord,
				to: coord,
				status: z.string(),
				microsteps: z
					.array(
						z.object({
							slot: z.number().int().min(0).max(5),
							from: coord,
							to: coord,
						}),
					)
					.nullish(),
			}),
		)
		.nullable(),
	tasks: z
		.array(
			z.object({ task_id: z.string(), status: z.string(), phase: z.string() }),
		)
		.nullable(),
	stock_changes: z
		.array(
			z.object({
				batch_id: z.string(),
				quantity: z.number().int(),
				reserved_quantity: z.number().int(),
				cell_x: z.number().int().nullable().optional(),
				cell_y: z.number().int().nullable().optional(),
				robot_id: z.string().nullable().optional(),
			}),
		)
		.nullable(),
	order_changes: z
		.array(z.object({ order_id: z.string(), status: z.string() }))
		.nullable(),
});
export type StatePatch = z.infer<typeof statePatchDto>;
