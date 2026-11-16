import { createContext, useContext } from "react";
import type {
	CommandExecutor,
	CommandHandler,
	Warehouse,
} from "@/domain/warehouse";
import type { MutationReceipt } from "./data";

export interface WarehouseScope {
	warehouse: Warehouse;
	execute: CommandExecutor<MutationReceipt>;
	command: CommandHandler;
	pending: boolean;
}

const WarehouseScopeContext = createContext<WarehouseScope | null>(null);

export const WarehouseScopeProvider = WarehouseScopeContext.Provider;

export function useWarehouseScope() {
	const scope = useContext(WarehouseScopeContext);
	if (!scope) throw new Error("WarehouseScopeProvider is missing");
	return scope;
}

export function selectWarehouseScope<Key extends keyof Warehouse>(
	scope: WarehouseScope,
	fields: readonly Key[],
): Omit<WarehouseScope, "warehouse"> & { warehouse: Pick<Warehouse, Key> } {
	const selected = {} as Pick<Warehouse, Key>;

	for (const field of fields) selected[field] = scope.warehouse[field];

	return { ...scope, warehouse: selected };
}

export function useWarehouseScreen<Key extends keyof Warehouse>(
	fields: readonly Key[],
) {
	return selectWarehouseScope(useWarehouseScope(), fields);
}
