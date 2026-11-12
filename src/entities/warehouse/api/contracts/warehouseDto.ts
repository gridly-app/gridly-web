import { z } from "zod";
import {
	cabinetSchema,
	warehouseSummarySchema,
	writeOffSchema,
} from "../../model/warehouse";
import { counter, identity, revision } from "./resourceFields";

const timeZone = z.string().refine((value) => {
	try {
		new Intl.DateTimeFormat(undefined, { timeZone: value });
		return true;
	} catch {
		return false;
	}
}, "Неподдерживаемый часовой пояс");

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
		allowed_actions: z.array(z.string()).optional(),
		summary: warehouseSummarySchema.optional(),
		cabinet_settings: cabinetSchema.optional(),
		write_offs: z.array(writeOffSchema).optional(),
		name: z.string(),
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		time_zone: timeZone,
		published_version: z.number().int().nullable().optional(),
		workflow_policy: policyDto,
		simulation_mode: z.enum(["paused", "running"]),
		worker_health: z.string(),
		tick: counter,
		state_version: counter,
		as_of: z.string().optional(),
		last_tick_at: z.string().optional(),
	})
	.refine((w) => w.width * w.height <= 10000, "Map exceeds 10000 cells");

export const createdWarehouseDto = z.object({ id: z.string() });

export const warehouseSettingsDto = z
	.object({
		revision: z.number().int().nonnegative(),
		location: z.string().max(200),
		low_stock_threshold: z.number().int().nonnegative(),
		allocation_policy: z.literal("fefo"),
	})
	.transform((v) => ({
		revision: v.revision,
		location: v.location,
		lowStockThreshold: v.low_stock_threshold,
		allocationPolicy: v.allocation_policy,
	}));

export type WarehouseDto = z.infer<typeof warehouseDto>;
export type PolicyDto = z.infer<typeof policyDto>;
