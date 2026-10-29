import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import {
	useWarehouseLivePolling,
	useWarehouseLiveSelection,
	type WarehouseLiveSelector,
} from "../../api/queries/queries";
import type { MutationReceipt } from "../../api/repositories/repository";
import type { CommandExecutor, CommandHandler } from "../commands/commands";
import type { Warehouse } from "../warehouse/schemas";
import { selectMapLive, selectRobotsLive } from "./liveSelectors";

export interface WarehouseScope {
	warehouse: Warehouse;
	execute: CommandExecutor<MutationReceipt>;
	command: CommandHandler;
	pending: boolean;
}

export interface WarehouseScopeProviderProps {
	value: WarehouseScope;
	children: ReactNode;
}

export const WarehouseDataContext = createContext<Warehouse | null>(null);
export const WarehouseCommandsContext = createContext<Pick<
	WarehouseScope,
	"execute" | "command"
> | null>(null);
export const WarehousePendingContext = createContext(false);

export function useWarehouseSnapshot() {
	const warehouse = useContext(WarehouseDataContext);
	if (!warehouse) throw new Error("WarehouseScopeProvider is missing");
	return warehouse;
}

export function useWarehouseCommands() {
	const commands = useContext(WarehouseCommandsContext);
	if (!commands) throw new Error("WarehouseScopeProvider is missing");
	return commands;
}

export function useWarehouseScope() {
	const warehouse = useWarehouseSnapshot();
	const commands = useWarehouseCommands();
	const pending = useContext(WarehousePendingContext);
	return { warehouse, ...commands, pending };
}

export function useLiveWarehouseScope<T extends Partial<Warehouse>>(
	select: WarehouseLiveSelector<T>,
) {
	const scope = useWarehouseScope();
	const needsLive = select === selectMapLive || select === selectRobotsLive;
	useWarehouseLivePolling(scope.warehouse.id, needsLive);
	const live = useWarehouseLiveSelection(scope.warehouse, select);
	return {
		...scope,
		warehouse: {
			...scope.warehouse,
			...(live.data ?? select(scope.warehouse)),
		},
		pending: scope.pending || (needsLive && live.isError),
	};
}
