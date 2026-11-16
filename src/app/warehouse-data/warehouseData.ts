import { useQueryClient } from "@tanstack/react-query";
import type { Warehouse } from "@/domain/warehouse";
import type { WarehouseData } from "@/ports/warehouse";
import { useLayoutOperation } from "./layout/useLayoutOperation";
import {
	useCreateWarehouse,
	useRouteProposal,
	useWarehouseCommand,
} from "./queries/mutations";
import {
	useLiveWarehouseScope,
	useOrder,
	useSelectionSummary,
	useWarehouse,
	useWarehouseConnection,
	useWarehouseLiveSubscription,
	useWarehouseResources,
	useWarehouses,
} from "./queries/queries";
import { useWarehouseRepository } from "./WarehouseRepositoryProvider";

function useWarehouseCache() {
	const cache = useQueryClient();
	const { keys: warehouseKeys } = useWarehouseRepository();

	return {
		getSnapshot: (id: string) =>
			cache.getQueryData<Warehouse>(warehouseKeys.detail(id)),
		getWarehouses: () => cache.getQueryData<Warehouse[]>(warehouseKeys.all),
		hasReadError: (id: string) =>
			cache
				.getQueryCache()
				.findAll({
					queryKey: warehouseKeys.resources(id),
				})
				.some((query) => query.state.status === "error"),
	};
}

export const warehouseData = {
	useScopeId: () => useWarehouseRepository().keys.scopeId,
	useLayoutOperation,
	useCreateWarehouse,
	useRouteProposal,
	useWarehouseCommand,
	useLiveWarehouseScope,
	useOrder,
	useSelectionSummary,
	useWarehouse,
	useWarehouseConnection,
	useWarehouseLiveSubscription,
	useWarehouseResources,
	useWarehouses,
	useWarehouseCache,
} satisfies WarehouseData;
