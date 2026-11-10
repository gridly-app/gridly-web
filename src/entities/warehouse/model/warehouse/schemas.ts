import { z } from "zod";
import { workflowPolicySchema } from "./workflowPolicy";

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

export const warehouseSummarySchema = z.object({
	robotCount: z.number().optional(),
	productCount: z.number().optional(),
	activeRobots: z.number().optional(),
	hasWaitingInbound: z.boolean().optional(),
	orders: z
		.object({
			inbound: z.object({
				total: z.number(),
				active: z.number(),
				completed: z.number(),
			}),
			outbound: z.object({
				total: z.number(),
				active: z.number(),
				completed: z.number(),
			}),
		})
		.optional(),
});

export const selectionSummarySchema = z.object({
	capacity: z.number(),
	batchCount: z.number(),
});

export const cellSchema = z.object({
	x: z.number(),
	y: z.number(),
	type: cellTypeSchema,
	capacity: z.number().optional(),
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
	allowedActions: z.array(z.string()).optional(),
	blockedReason: z.string().optional(),
	motionPath: z.array(gridPositionSchema).optional(),
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
	allowedActions: z.array(z.string()).optional(),
	productCount: z.number().optional(),
	revision: z.number().optional(),
	id: z.string(),
	name: z.string(),
	cold: z.boolean(),
	archived: z.boolean().optional(),
});

export const productSchema = z.object({
	allowedActions: z.array(z.string()).optional(),
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
	availableQuantity: z.number().optional(),
	writeOffBlockedReason: z.string().optional(),
	isExpired: z.boolean().optional(),
	canWriteOff: z.boolean().optional(),
	revision: z.number().optional(),
	batchId: z.string().optional(),
	cellId: z.string().optional(),
	id: z.string(),
	product: z.string(),
	quantity: z.number(),
	reserved: z.number().optional(),
	expires: z.string(),
	cell: z.string(),
});

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

export const eventSchema = z.object({
	warehouseId: z.string().optional(),
	type: z.string().optional(),
	entity: z.string().optional(),
	id: z.string(),
	time: z.string(),
	title: z.string(),
	detail: z.string(),
});

export const reportViewSchema = z.object({
	name: z.string().min(1).max(80),
	from: z.iso.date(),
	to: z.iso.date(),
	kind: z.string(),
	status: z.string(),
	category: z.string(),
	compare: z.boolean(),
});
export const writeOffSchema = z.object({
	id: z.string(),
	product: z.string(),
	quantity: z.number(),
	time: z.string(),
	reason: z.string(),
	price: z.number().nullable(),
});
export const cabinetSchema = z.object({
	reportViews: z.array(reportViewSchema).optional(),
	location: z.string().max(200),
	placement: z.enum(["fifo", "fefo"]),
	allowMixedCategories: z.boolean(),
	reserveOnStart: z.boolean(),
	lowStockThreshold: z.number().int().nonnegative(),
});

export const warehouseSettingsSchema = z.object({
	revision: z.number().int().nonnegative(),
	location: z.string().max(200),
	lowStockThreshold: z.number().int().nonnegative(),
	allocationPolicy: z.literal("fefo"),
});
export type WarehouseSettings = z.infer<typeof warehouseSettingsSchema>;

export const warehouseSchema = z.object({
	cabinet: cabinetSchema.optional(),
	settings: warehouseSettingsSchema.optional(),
	writeOffs: z.array(writeOffSchema).optional(),
	allowedActions: z.array(z.string()).optional(),
	summary: warehouseSummarySchema.optional(),
	draftRoutes: z.array(blockRoutePlanSchema).optional(),
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
	policy: workflowPolicySchema,
	tick: z.string(),
});

export const warehouseLiveStateSchema = warehouseSchema
	.pick({ stateVersion: true, tick: true, robots: true, asOf: true })
	.extend({
		layoutVersion: z.number(),
		summary: warehouseSummarySchema.optional(),
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
