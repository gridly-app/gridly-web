import { z } from "zod";
import {
	blockRoutePlanSchema,
	categorySchema,
	cellSchema,
	orderSchema,
	productSchema,
	robotSchema,
	warehouseSchema,
} from "../warehouse";

export const orderInputSchema = orderSchema
	.pick({ kind: true, party: true, lines: true, manual: true })
	.extend({ id: z.string().optional(), revision: z.number().optional() });

export const robotParameterLimits = {
	speed: { min: 1, max: 5 },
	duration: { min: 1, max: 20 },
} as const;

const robotParameters = robotSchema
	.pick({ name: true, capacity: true })
	.extend({
		name: z.string().trim().min(1).max(80),
		roles: z.array(z.enum(["unload", "sort", "ship"])).min(1),
		speed: z
			.number()
			.int()
			.min(robotParameterLimits.speed.min)
			.max(robotParameterLimits.speed.max),
		duration: z
			.number()
			.int()
			.min(robotParameterLimits.duration.min)
			.max(robotParameterLimits.duration.max),
		capacity: z
			.string()
			.regex(/^\d+(\.\d{1,3})?$/)
			.refine((v) => Number.isFinite(Number(v)) && Number(v) > 0),
	});
export const robotCreateSchema = robotParameters.extend({
	id: z.undefined().optional(),
	revision: z.undefined().optional(),
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
});
export const robotUpdateSchema = robotParameters.extend({
	id: z.string().min(1),
	revision: z.number().int().nonnegative(),
});
export const robotInputSchema = z.union([robotCreateSchema, robotUpdateSchema]);

export const warehouseInputSchema = warehouseSchema.pick({
	name: true,
	width: true,
	height: true,
	timezone: true,
});

export const categoryInputSchema = categorySchema
	.pick({ name: true, cold: true })
	.extend({ id: z.string().optional(), revision: z.number().optional() });

export const productInputSchema = productSchema
	.omit({ id: true, allowedActions: true })
	.extend({ id: z.string().optional() });

export const layoutInputSchema = z.object({
	cells: z.array(cellSchema),
	routes: z.array(blockRoutePlanSchema),
	baseVersion: z.number(),
	categories: z
		.array(categoryInputSchema.extend({ id: z.string() }))
		.optional(),
	draftRevision: z.number().optional(),
});

export const commandPayloads = {
	deleteWarehouse: z.undefined().optional(),
	archiveProduct: z.string(),
	archiveCategory: z.string(),
	deleteOrder: z.string(),
	warehouseSettings: z
		.object({
			revision: z.number().int().nonnegative(),
			location: z.string().trim().max(200).optional(),
			lowStockThreshold: z.number().int().nonnegative().optional(),
		})
		.refine(
			(v) => v.location !== undefined || v.lowStockThreshold !== undefined,
			"Нет изменений",
		),
	saveMap: layoutInputSchema,
	resize: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
	simulation: z.undefined().optional(),
	discard: z.object({ draftRevision: z.number().int().nonnegative() }),
	robot: robotInputSchema,
	deleteRobot: z.string(),
	product: productInputSchema,
	category: categoryInputSchema,
	order: orderInputSchema,
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
		quantity: z.number().int().positive(),
		reason: z.string().trim().min(1).max(500),
	}),
	settings: z.discriminatedUnion("section", [
		z.object({
			section: z.literal("name"),
			name: warehouseSchema.shape.name,
			revision: z.number().optional(),
		}),
		z.object({
			section: z.literal("policy"),
			policy: warehouseSchema.shape.policy,
			policyRevision: z.number().optional(),
		}),
	]),
};

function command<K extends keyof typeof commandPayloads>(action: K) {
	return z.object({
		action: z.literal(action),
		value: commandPayloads[action],
	});
}

export const warehouseCommandSchema = z.discriminatedUnion("action", [
	command("deleteWarehouse"),
	command("archiveProduct"),
	command("archiveCategory"),
	command("deleteOrder"),
	command("warehouseSettings"),
	command("saveMap"),
	command("resize"),
	command("simulation"),
	command("discard"),
	command("robot"),
	command("deleteRobot"),
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
