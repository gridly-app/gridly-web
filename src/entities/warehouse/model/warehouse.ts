import { z } from "zod";
import { categorySchema, productSchema } from "./catalog";
import { eventSchema } from "./history";
import { stockSchema, writeOffSchema } from "./inventory";
import { blockRoutePlanSchema, cellSchema } from "./layout/layout";
import { orderSchema } from "./order";
import { robotSchema } from "./robot";
import { cabinetSchema, warehouseSettingsSchema } from "./warehouseSettings";
import { workflowPolicySchema } from "./workflowPolicy";

export {
	type Category,
	categorySchema,
	type Product,
	productSchema,
} from "./catalog";
export { type Event, eventSchema } from "./history";
export { type Stock, stockSchema, writeOffSchema } from "./inventory";
export {
	type BlockRoutePlan,
	blockRoutePlanSchema,
	type Cell,
	type CellType,
	cellSchema,
	cellTypeSchema,
	type GridPosition,
	gridPositionSchema,
	type StorageZone,
	selectionSummarySchema,
	storageCellTypes,
	storageZoneSchema,
} from "./layout/layout";
export { type Order, orderSchema } from "./order";
export {
	type Robot,
	type RobotTask,
	robotSchema,
	robotTaskSchema,
} from "./robot";
export {
	cabinetSchema,
	reportViewSchema,
	type WarehouseSettings,
	warehouseSettingsSchema,
} from "./warehouseSettings";

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
	.extend({ layoutVersion: z.number() });

export type Warehouse = z.infer<typeof warehouseSchema>;
export type WarehouseLiveState = z.infer<typeof warehouseLiveStateSchema>;
