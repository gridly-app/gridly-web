import { z } from "zod";

export const cellTypeSchema = z.union([
	z.literal("empty"),
	z.literal("aisle"),
	z.literal("storage"),
	z.literal("cold"),
	z.literal("unload"),
	z.literal("load"),
	z.literal("charge"),
	z.literal("wall"),
]);

export const storageZoneSchema = z.object({
	id: z.string(),
	name: z.string(),
	categoryId: z.string(),
});

export const cellSchema = z.object({
	x: z.number(),
	y: z.number(),
	type: cellTypeSchema,
	capacity: z.number(),
	zone: storageZoneSchema.optional(),
});

export const gridPositionSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export const blockRoutePlanSchema = z.object({
	inboundVia: z.array(gridPositionSchema).optional(),
	outboundVia: z.array(gridPositionSchema).optional(),
	id: z.string(),
	keys: z.array(z.string()),
	inbound: z.array(gridPositionSchema),
	outbound: z.array(gridPositionSchema),
});

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

export const categorySchema = z.object({
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	cold: z.boolean(),
	archived: z.boolean().optional(),
});

export const productSchema = z.object({
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	sku: z.string(),
	category: z.string(),
	volume: z.string(),
	price: z.string(),
	shelf: z.number(),
	archived: z.boolean().optional(),
});

export const stockSchema = z.object({
	revision: z.number().optional(),
	batchId: z.string().optional(),
	cellId: z.string().optional(),
	id: z.string(),
	product: z.string(),
	quantity: z.number(),
	reserved: z.number(),
	expires: z.string(),
	cell: z.string(),
});

export const orderSchema = z.object({
	allocations: z
		.array(
			z.object({
				lineIndex: z.number().int().nonnegative(),
				stockId: z.string().optional(),
				cell: z.string(),
				quantity: z.number().positive(),
				delivered: z.number().nonnegative(),
			}),
		)
		.optional(),
	deliveredTaskIds: z.array(z.string()).optional(),
	putaways: z
		.array(
			z.object({
				lineIndex: z.number(),
				cell: z.string(),
				quantity: z.number(),
			}),
		)
		.optional(),
	demoAutoStart: z.boolean().optional(),
	processed: z.array(z.number()).optional(),
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
	manual: z.array(z.boolean()),
	stage: z.number(),
	created: z.string(),
	reason: z.string().optional(),
});

export const eventSchema = z.object({
	id: z.string(),
	time: z.string(),
	title: z.string(),
	detail: z.string(),
});

export const warehouseSchema = z.object({
	demoVersion: z.number().optional(),
	routePlans: z.array(blockRoutePlanSchema).optional(),
	revision: z.number().optional(),
	draftRevision: z.number().optional(),
	policyRevision: z.number().optional(),
	stateVersion: z.string().optional(),
	workerHealth: z.string().optional(),
	asOf: z.string().optional(),
	lastTickAt: z.string().optional(),
	id: z.string(),
	name: z.string(),
	location: z.string(),
	width: z.number(),
	height: z.number(),
	timezone: z.string(),
	published: z.boolean(),
	version: z.number(),
	running: z.boolean(),
	cells: z.array(cellSchema),
	draft: z.union([z.array(cellSchema), z.null()]),
	robots: z.array(robotSchema),
	categories: z.array(categorySchema),
	products: z.array(productSchema),
	stock: z.array(stockSchema),
	orders: z.array(orderSchema),
	events: z.array(eventSchema),
	policy: z.array(z.boolean()),
	tick: z.string(),
});

export const warehouseLiveStateSchema = warehouseSchema
	.pick({ stateVersion: true, tick: true, robots: true, asOf: true })
	.extend({
		layoutVersion: z.number(),
		orders: z.array(orderSchema).optional(),
		stock: z.array(stockSchema).optional(),
		events: z.array(eventSchema).optional(),
		running: z.boolean().optional(),
	});

export type CellType = z.infer<typeof cellTypeSchema>;
export const storageCellTypes: readonly CellType[] = ["storage", "cold"];
export type StorageZone = z.infer<typeof storageZoneSchema>;
export type Cell = z.infer<typeof cellSchema>;
export type GridPosition = z.infer<typeof gridPositionSchema>;
export type BlockRoutePlan = z.infer<typeof blockRoutePlanSchema>;
export type RobotTask = z.infer<typeof robotTaskSchema>;
export type Robot = z.infer<typeof robotSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Warehouse = z.infer<typeof warehouseSchema>;
export type WarehouseLiveState = z.infer<typeof warehouseLiveStateSchema>;
