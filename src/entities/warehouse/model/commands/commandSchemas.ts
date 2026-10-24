import { z } from "zod";
import {
	blockRoutePlanSchema,
	categorySchema,
	cellSchema,
	orderSchema,
	productSchema,
	robotSchema,
	storageZoneSchema,
	warehouseSchema,
} from "../warehouse/schemas";

export const commandPayloads = {
	routes: z.array(blockRoutePlanSchema),
	resize: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
	simulation: z.undefined().optional(),
	draft: z.array(cellSchema),
	discard: z.undefined().optional(),
	publish: z.array(cellSchema),
	robot: robotSchema.partial({ x: true, y: true }),
	deleteRobot: z.string(),
	zone: z.object({ keys: z.array(z.string()), zone: storageZoneSchema }),
	product: productSchema,
	category: categorySchema,
	order: orderSchema,
	start: z.string(),
	confirm: z.string(),
	cancel: z.string(),
	orderAction: z.object({
		id: z.string(),
		action: z.string(),
		revision: z.number().optional(),
		reason: z.string().optional(),
	}),
	taskAction: z.object({
		orderId: z.string(),
		id: z.string(),
		action: z.string(),
		revision: z.number().optional(),
	}),
	writeoff: z.object({
		revision: z.number().optional(),
		id: z.string(),
		quantity: z.number(),
		reason: z.string(),
	}),
	settings: warehouseSchema.pick({
		name: true,
		timezone: true,
		policy: true,
		revision: true,
		policyRevision: true,
	}),
};

function command<K extends keyof typeof commandPayloads>(action: K) {
	return z.object({
		action: z.literal(action),
		value: commandPayloads[action],
	});
}

export const warehouseCommandSchema = z.discriminatedUnion("action", [
	command("routes"),
	command("resize"),
	command("simulation"),
	command("draft"),
	command("discard"),
	command("publish"),
	command("robot"),
	command("deleteRobot"),
	command("zone"),
	command("product"),
	command("category"),
	command("order"),
	command("start"),
	command("confirm"),
	command("cancel"),
	command("orderAction"),
	command("taskAction"),
	command("writeoff"),
	command("settings"),
]);
