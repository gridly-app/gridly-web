import { useQueryClient } from "@tanstack/react-query";
import type { useWarehouse } from "@/entities/warehouse";
import {
	type CommandExecutor,
	useWarehouseCommand,
	type Warehouse,
	type WarehouseCommand,
	warehouseKeys,
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
	const execute: CommandExecutor<Warehouse> = async (action, ...[value]) => {
		try {
			if (
				(requiresNetwork && !navigator.onLine) ||
				snapshot.isError ||
				cache.getQueryState(warehouseKeys.live(warehouseId))?.status ===
					"error" ||
				!snapshot.data ||
				(snapshot.isFetching && !snapshot.dataUpdatedAt)
			) {
				throw new Error("Дождитесь синхронизации склада");
			}
			const saved = await mutation.mutateAsync({
				action,
				value,
			} as WarehouseCommand);
			notify("Изменения сохранены");
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
