import {
	type CommandExecutor,
	type CommandHandler,
	type CommandIntent,
	type CommandPayloads,
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

	async function save(
		action: keyof CommandPayloads,
		value: unknown,
		intent: CommandIntent | undefined,
	) {
		if (!navigator.onLine || isSnapshotStale)
			throw new UserError("Дождитесь синхронизации склада");

		const receipt = await mutation.mutateAsync({
			...warehouseCommandSchema.parse({ action, value }),
			operationId: intent?.operationId,
		});
		const notice = hasReadError(warehouseId)
			? "Изменения сохранены. Не удалось обновить данные; повторите синхронизацию."
			: "Изменения сохранены";

		notify(notice);

		return receipt;
	}

	const execute: CommandExecutor<MutationReceipt> = (
		action,
		...[value, intent]
	) => save(action, value, intent);

	const command: CommandHandler = async (action, ...args) => {
		try {
			await execute(action, ...args);

			return { ok: true };
		} catch (error) {
			notify(errorMessage(error));

			return { ok: false, error };
		}
	};

	return { execute, command, pending: mutation.isPending };
}
