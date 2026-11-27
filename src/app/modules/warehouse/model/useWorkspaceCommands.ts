import {
	type CommandExecutor,
	type CommandHandler,
	warehouseCommandSchema,
} from "@/domain/warehouse";
import {
	type MutationReceipt,
	useWarehouseCache,
	useWarehouseCommand,
} from "@/ports/warehouse";
import { errorMessage, UserError } from "@/shared/lib";

import { useWorkspaceNotice } from "./useWorkspaceNotice";

export function useWorkspaceCommands(
	warehouseId: string,
	isSnapshotStale: boolean,
) {
	const notify = useWorkspaceNotice();
	const mutation = useWarehouseCommand(warehouseId);
	const { hasReadError } = useWarehouseCache();
	const execute: CommandExecutor<MutationReceipt> = async (
		action,
		...[value, intent]
	) => {
		try {
			if (!navigator.onLine || isSnapshotStale) {
				throw new UserError("Дождитесь синхронизации склада");
			}
			const saved = await mutation.mutateAsync({
				...warehouseCommandSchema.parse({ action, value }),
				operationId: intent?.operationId,
			});
			notify(
				hasReadError(warehouseId)
					? "Изменения сохранены. Не удалось обновить данные; повторите синхронизацию."
					: "Изменения сохранены",
			);
			return saved;
		} catch (error) {
			notify(errorMessage(error));
			throw error;
		}
	};
	const command: CommandHandler = async (action, ...args) => {
		try {
			await execute(action, ...args);
			return { ok: true };
		} catch (error) {
			return { ok: false, error };
		}
	};
	return {
		execute,
		command,
		pending: mutation.isPending,
	};
}
