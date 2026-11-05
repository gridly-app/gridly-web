import { z } from "zod";
import {
	blockRoutePlanSchema,
	cabinetSchema,
	categorySchema,
	cellSchema,
	orderSchema,
	productSchema,
	robotSchema,
	stockSchema,
	warehouseSchema,
} from "../warehouse/schemas";

export const orderInputSchema = orderSchema
	.pick({ kind: true, party: true, lines: true, manual: true })
	.extend({ id: z.string().optional(), revision: z.number().optional() });

export const robotInputSchema = robotSchema
	.pick({
		name: true,
		roles: true,
		speed: true,
		duration: true,
		capacity: true,
	})
	.extend({ id: z.string().optional(), revision: z.number().optional() });

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
	deleteProduct: z.string(),
	deleteCategory: z.string(),
	deleteOrder: z.string(),
	stock: stockSchema
		.extend({
			id: z.string().min(1),
			product: z.string().min(1),
			quantity: z.number().int().nonnegative(),
			reserved: z.number().int().nonnegative().optional(),
			cell: z.string().regex(/^\d+,\d+$/),
		})
		.refine(
			(s) => (s.reserved ?? 0) <= s.quantity,
			"Резерв не может превышать остаток",
		),
	deleteStock: z.string(),
	cabinet: cabinetSchema,
	saveMap: layoutInputSchema,
	resize: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
	simulation: z.undefined().optional(),
	discard: z.undefined().optional(),
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
		quantity: z.number(),
		reason: z.string(),
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
	command("deleteProduct"),
	command("deleteCategory"),
	command("deleteOrder"),
	command("stock"),
	command("deleteStock"),
	command("cabinet"),
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
