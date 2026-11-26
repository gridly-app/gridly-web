import { createContext, useContext } from "react";

import type {
	CommandExecutor,
	CommandHandler,
	Warehouse,
	WarehouseResource,
	WarehouseResourceData,
	WarehouseView,
} from "@/domain/warehouse";

import type { MutationReceipt } from "./data";

export interface WarehouseScope {
	warehouse: Warehouse & Partial<WarehouseResourceData<WarehouseResource>>;
	resources: readonly WarehouseResource[];
	execute: CommandExecutor<MutationReceipt>;
	command: CommandHandler;
	pending: boolean;
}

export type WarehouseScreen<Resource extends WarehouseResource> = Omit<
	WarehouseScope,
	"warehouse" | "resources"
> & {
	warehouse: WarehouseView<Resource>;
};

const WarehouseScopeContext = createContext<WarehouseScope | null>(null);

export const WarehouseScopeProvider = WarehouseScopeContext.Provider;

export function useWarehouseScope() {
	const scope = useContext(WarehouseScopeContext);

	if (!scope) throw new Error("WarehouseScopeProvider is missing");

	return scope;
}

function hasWarehouseResources<Resource extends WarehouseResource>(
	scope: WarehouseScope,
	resources: readonly Resource[],
): scope is WarehouseScope & WarehouseScreen<Resource> {
	return resources.every((resource) => scope.resources.includes(resource));
}

export function selectWarehouseScope<Resource extends WarehouseResource>(
	scope: WarehouseScope,
	resources: readonly Resource[],
): WarehouseScreen<Resource> {
	if (!hasWarehouseResources(scope, resources)) {
		const missing = resources.filter(
			(resource) => !scope.resources.includes(resource),
		);

		throw new Error(
			`Раздел запросил ресурсы склада вне своего маршрута: ${missing.join(", ")}`,
		);
	}

	return scope;
}

export function useWarehouseScreen<Resource extends WarehouseResource>(
	resources: readonly Resource[],
) {
	return selectWarehouseScope(useWarehouseScope(), resources);
}
