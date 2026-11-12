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

export type CellType = z.infer<typeof cellTypeSchema>;

export const storageCellTypes: readonly CellType[] = ["storage", "cold"];

export type StorageZone = z.infer<typeof storageZoneSchema>;
export type Cell = z.infer<typeof cellSchema>;
export type GridPosition = z.infer<typeof gridPositionSchema>;
export type BlockRoutePlan = z.infer<typeof blockRoutePlanSchema>;
