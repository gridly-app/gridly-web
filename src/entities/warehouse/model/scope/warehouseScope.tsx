import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { MutationReceipt } from "../../api/repositories/repository";
import type { CommandExecutor, CommandHandler } from "../commands/commands";
import type { Warehouse } from "../warehouse";

export interface WarehouseScope {
	warehouse: Warehouse;
	execute: CommandExecutor<MutationReceipt>;
	command: CommandHandler;
	pending: boolean;
}

const WarehouseScopeContext = createContext<WarehouseScope | null>(null);

export function WarehouseScopeProvider({
	value,
	children,
}: {
	value: WarehouseScope;
	children: ReactNode;
}) {
	return (
		<WarehouseScopeContext.Provider value={value}>
			{children}
		</WarehouseScopeContext.Provider>
	);
}

export function useWarehouseScope() {
	const scope = useContext(WarehouseScopeContext);
	if (!scope) throw new Error("WarehouseScopeProvider is missing");
	return scope;
}
