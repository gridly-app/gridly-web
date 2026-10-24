import type { CommandPayloads, Warehouse } from "@/entities/warehouse";
import type { SimulationContext } from "../simulation/context";
export type CommandHandler<K extends keyof CommandPayloads> = (
	warehouse: Warehouse,
	value: CommandPayloads[K],
	context: SimulationContext,
) => void;

export type CommandHandlers = {
	[K in keyof CommandPayloads]: CommandHandler<K>;
};
