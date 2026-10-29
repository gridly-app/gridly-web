import { useQueryClient } from "@tanstack/react-query";
import type { useWarehouse } from "@/entities/warehouse";
import {
	type CommandExecutor,
	type MutationReceipt,
	useWarehouseCommand,
	type WarehouseCommand,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { createCommandHandler } from "./createCommandHandler";

export interface WorkspaceCommandOptions {
	warehouseId: string;
	snapshot: Pick<
		ReturnType<typeof useWarehouse>,
		"isError" | "data" | "isFetching" | "dataUpdatedAt"
	>;
	requiresNetwork: boolean;
	notify: (message: string) => void;
}

export function useWorkspaceCommands({
	warehouseId,
	snapshot,
	requiresNetwork,
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
				(requiresNetwork && !navigator.onLine) ||
				snapshot.isError ||
				!snapshot.data ||
				(snapshot.isFetching && !snapshot.dataUpdatedAt)
			) {
				throw new Error("Дождитесь синхронизации склада");
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
	return {
		execute,
		command: createCommandHandler(execute),
		pending: mutation.isPending,
	};
}
