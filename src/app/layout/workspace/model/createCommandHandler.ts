import type { CommandExecutor, CommandHandler } from "@/entities/warehouse";

export function createCommandHandler(execute: CommandExecutor): CommandHandler {
	return async (action, ...args) => {
		try {
			await execute(action, ...args);

			return { ok: true };
		} catch (error) {
			return { ok: false, error };
		}
	};
}
