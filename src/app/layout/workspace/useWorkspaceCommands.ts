import { useQueryClient } from "@tanstack/react-query";
import type { useWarehouse } from "@/entities/warehouse";
import {
	type CommandExecutor,
	type CommandHandler,
	type MutationReceipt,
	useWarehouseCommand,
	type WarehouseCommand,
} from "@/entities/warehouse";
import { errorMessage, UserError } from "@/shared/lib";

export interface WorkspaceCommandOptions {
	warehouseId: string;
	snapshot: Pick<
		ReturnType<typeof useWarehouse>,
		"isError" | "data" | "isFetching" | "dataUpdatedAt"
	>;
	notify: (message: string) => void;
}

export function useWorkspaceCommands({
	warehouseId,
	snapshot,
	notify,
}: WorkspaceCommandOptions) {
	const mutation = useWarehouseCommand(warehouseId);
	const cache = useQueryClient();
	const execute: CommandExecutor<MutationReceipt> = async (
		action,
		...[value, intent]
	) => {
		try {
			if (
				!navigator.onLine ||
				snapshot.isError ||
				!snapshot.data ||
				(snapshot.isFetching && !snapshot.dataUpdatedAt)
			) {
				throw new UserError("Дождитесь синхронизации склада");
			}
			const saved = await mutation.mutateAsync({
				action,
				value,
				operationId: intent?.operationId,
			} as WarehouseCommand);
			notify(
				cache
					.getQueryCache()
					.findAll({ queryKey: ["warehouses", warehouseId, "resource"] })
					.some((query) => query.state.status === "error")
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
