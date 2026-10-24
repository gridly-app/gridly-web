import type { z } from "zod";
import type { Robot, Warehouse } from "../warehouse/schemas";
import type { commandPayloads, warehouseCommandSchema } from "./commandSchemas";

export type RobotInput = Omit<Robot, "x" | "y"> &
	Partial<Pick<Robot, "x" | "y">>;

export type WarehouseSettings = Pick<
	Warehouse,
	"name" | "timezone" | "policy" | "revision" | "policyRevision"
>;

export type CommandPayloads = {
	[K in keyof typeof commandPayloads]: z.infer<(typeof commandPayloads)[K]>;
};

export type WarehouseCommand = z.infer<typeof warehouseCommandSchema>;

export type CommandExecutor<Result = unknown> = <
	K extends keyof CommandPayloads,
>(
	action: K,
	...args: CommandPayloads[K] extends undefined
		? [value?: undefined]
		: [value: CommandPayloads[K]]
) => Promise<Result>;

export type CommandResult = { ok: true } | { ok: false; error: unknown };

export type CommandHandler = CommandExecutor<CommandResult>;
