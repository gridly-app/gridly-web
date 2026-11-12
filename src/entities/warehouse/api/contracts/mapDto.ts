import { z } from "zod";
import { blockRoutePlanSchema, storageZoneSchema } from "../../model/warehouse";
import { counter, decimal, revision } from "./resourceFields";
import { warehouseDto } from "./warehouseDto";

const cellDto = z.object({
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
	code: z.string().nullable().optional(),
	capacity_volume: decimal,
	zone: storageZoneSchema.optional(),
});

export const layoutDto = z
	.object({
		version: z.number().optional(),
		revision,
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		cells: z.array(cellDto),
		routes: z.array(blockRoutePlanSchema).optional(),
	})
	.refine(
		(l) =>
			l.width * l.height <= 10000 &&
			l.cells.every((c) => c.x < l.width && c.y < l.height),
		"Invalid map bounds",
	);

const positionDto = z.object({
	motion_path: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
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
	as_of: z.string().optional(),
});

export const legacyMapStateDto = z.object({
	warehouse: warehouseDto,
	robots: z.array(positionDto).nullable(),
});

export type LayoutDto = z.infer<typeof layoutDto>;
export type MapStateDto = z.infer<typeof mapStateDto>;
