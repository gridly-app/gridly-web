import type { z } from "zod";
import type { Warehouse } from "../warehouse/schemas";
import type { commandPayloads, warehouseCommandSchema } from "./commandSchemas";

export type RobotInput = CommandPayloads["robot"];

export type CategoryInput = CommandPayloads["category"];

export type ProductInput = CommandPayloads["product"];

export type OrderInput = CommandPayloads["order"];

export type WarehouseInput = Pick<
	Warehouse,
	"name" | "width" | "height" | "timezone"
>;

export type WarehouseSettings = CommandPayloads["settings"];

export type CommandPayloads = {
	[K in keyof typeof commandPayloads]: z.infer<(typeof commandPayloads)[K]>;
};

export type WarehouseCommand = z.infer<typeof warehouseCommandSchema>;

export interface CommandIntent {
	operationId: string;
}

export type CommandExecutor<Result = unknown> = <
	K extends keyof CommandPayloads,
>(
	action: K,
	...args: CommandPayloads[K] extends undefined
		? [value?: undefined, intent?: CommandIntent]
		: [value: CommandPayloads[K], intent?: CommandIntent]
) => Promise<Result>;

export type CommandResult = { ok: true } | { ok: false; error: unknown };

export type CommandHandler = CommandExecutor<CommandResult>;
