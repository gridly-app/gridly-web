import { z } from "zod";

const revision = z.number().int().nonnegative().optional();
const identity = { id: z.string(), revision };
const counter = z.union([
	z.string().regex(/^\d+$/),
	z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
]);
const decimal = z.union([z.string().regex(/^-?\d+(?:\.\d+)?$/), z.number()]);
const optionalText = z.string().optional();
const nullableText = z.string().nullable().optional();
const optionalNumber = z.number().optional();
export const policyDto = z.object({
	revision,
	confirm_unload: z.boolean(),
	confirm_pick: z.boolean(),
	confirm_putaway: z.boolean(),
	confirm_load: z.boolean(),
});
export const warehouseDto = z
	.object({
		...identity,
		name: z.string(),
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		time_zone: z.string(),
		published_version: z.number().int().nullable().optional(),
		workflow_policy: policyDto,
		simulation_mode: z.enum(["paused", "running"]),
		worker_health: z.string(),
		tick: counter,
		state_version: counter,
		as_of: optionalText,
		last_tick_at: optionalText,
	})
	.refine((w) => w.width * w.height <= 10000, "Map exceeds 10000 cells");
export const cellDto = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	kind: z.enum([
		"empty",
		"aisle",
		"storage_general",
		"storage_cold",
		"receiving",
		"shipping",
		"charging",
		"wall",
	]),
	code: nullableText,
	capacity_volume: decimal,
});
export const layoutDto = z
	.object({
		version: optionalNumber,
		revision,
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		cells: z.array(cellDto),
	})
	.refine(
		(l) =>
			l.width * l.height <= 10000 &&
			l.cells.every((c) => c.x < l.width && c.y < l.height),
		"Invalid map bounds",
	);
export const robotDto = z.object({
	...identity,
	name: z.string(),
	x: z.number(),
	y: z.number(),
	specializations: z.array(z.string()).optional(),
	roles: z.array(z.string()).optional(),
	speed_cells_per_tick: optionalNumber,
	speed: optionalNumber,
	action_ticks: z.number(),
	capacity_volume: decimal,
	status: z.string(),
});
export const categoryDto = z.object({
	...identity,
	name: z.string(),
	storage_kind: z.enum(["general", "cold"]),
	archived_at: nullableText,
	is_archived: z.boolean().optional(),
});
export const productDto = z.object({
	...identity,
	name: z.string(),
	sku: z.string(),
	category_id: z.string(),
	volume_per_unit: z.string().optional(),
	unit_volume: optionalNumber,
	price: decimal.nullable(),
	standard_shelf_life_days: z.number().nullable().optional(),
	default_shelf_life_days: z.number().nullable().optional(),
	archived_at: nullableText,
	is_archived: z.boolean().optional(),
});
export const taskDto = z.object({
	...identity,
	type: z.string(),
	status: z.string(),
	allowed_actions: z.array(z.string()).optional(),
});
export const orderDto = z.object({
	...identity,
	number: optionalText,
	kind: z.enum(["inbound", "outbound"]),
	counterparty_text: z.string(),
	status: z.string(),
	created_at: z.string(),
	confirmations: policyDto.optional(),
	confirm_unload: z.boolean().optional(),
	confirm_pick: z.boolean().optional(),
	confirm_putaway: z.boolean().optional(),
	confirm_load: z.boolean().optional(),
	allowed_actions: z.array(z.string()).optional(),
	blocked_reason: optionalText,
	tasks: z.array(taskDto).optional(),
	lines: z
		.array(
			z.object({
				id: optionalText,
				product_id: z.string(),
				quantity: z.number(),
				expires_on: nullableText,
				putaway_quantity: optionalNumber,
				placed_quantity: optionalNumber,
				written_off_quantity: optionalNumber,
				lost_quantity: optionalNumber,
			}),
		)
		.optional(),
});
export const stockDto = z.object({
	...identity,
	batch_id: z.string(),
	product_id: z.string(),
	quantity: z.number(),
	reserved_quantity: optionalNumber,
	expires_on: z.string().nullable(),
	cell_id: optionalText,
	cell_x: optionalNumber,
	cell_y: optionalNumber,
	robot_id: optionalText,
});
const positionDto = z.object({
	id: z.string(),
	x: z.number(),
	y: z.number(),
	status: z.string(),
});
export const mapStateDto = z.object({
	warehouse_id: z.string(),
	state_version: counter,
	tick: counter,
	layout_version: z.number(),
	robots: z.array(positionDto),
	as_of: optionalText,
});
export const legacyMapStateDto = z.object({
	warehouse: warehouseDto,
	robots: z.array(positionDto).nullable(),
});
export const eventDto = z.object({
	id: z.union([z.string(), z.number()]),
	event_type: optionalText,
	entity_locator: optionalText,
	payload: z.unknown().optional(),
	created_at: z.string(),
	message: optionalText,
	detail: optionalText,
});
export const revisionDto = z.object({ revision });
export const createdDto = z.object({ id: z.string() });
export const validationDto = z.object({
	valid: z.boolean(),
	issues: z.array(z.object({ message: z.string() })),
});

export type Revisioned = z.infer<typeof createdDto> & { revision?: number };
export type PolicyDto = z.infer<typeof policyDto>;
export type WarehouseDto = z.infer<typeof warehouseDto>;
export type CellDto = z.infer<typeof cellDto>;
export type LayoutDto = z.infer<typeof layoutDto>;
export type RobotDto = z.infer<typeof robotDto>;
export type CategoryDto = z.infer<typeof categoryDto>;
export type ProductDto = z.infer<typeof productDto>;
export type TaskDto = z.infer<typeof taskDto>;
export type OrderDto = z.infer<typeof orderDto>;
export type StockDto = z.infer<typeof stockDto>;
export type MapStateDto = z.infer<typeof mapStateDto>;
export type EventDto = z.infer<typeof eventDto>;
