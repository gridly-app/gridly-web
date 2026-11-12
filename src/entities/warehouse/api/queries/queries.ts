import { skipToken, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { usePageVisible } from "@/shared/lib";
import { selectWarehouseMotion } from "../../model/liveState";
import { useWarehouseScope } from "../../model/scope/warehouseScope";
import type { Warehouse } from "../../model/warehouse";
import { useWarehouseRepository } from "../WarehouseRepositoryProvider";
import { warehouseKeys } from "./queryKeys";
import { type WarehouseResource, warehouseResourceData } from "./resources";

export function useOrder(id: string, orderId: string | null) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();

	const query = useQuery({
		queryKey: warehouseKeys.order(id, orderId),
		queryFn: ({ signal }) => {
			if (!orderId || !repository.getOrder) {
				throw new Error("Загрузка заказа недоступна");
			}
			return repository.getOrder(id, orderId, signal);
		},
		enabled: !!orderId && !!repository.getOrder && visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});
	return { ...query, supported: !!repository.getOrder };
}

export function useWarehouses() {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();

	return useQuery({
		queryKey: warehouseKeys.all,
		queryFn: ({ signal }) => repository.list(signal),
		refetchInterval: visible ? 5000 : false,
		enabled: visible,
	});
}

export function useWarehouse(id: string) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	const snapshot = useQuery({
		queryKey: warehouseKeys.resource(id, "metadata"),
		queryFn: ({ signal }) => repository.get(id, signal, "metadata"),
		enabled: id !== "new" && visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});
	return snapshot;
}

function useWarehouseLiveUpdates(id: string, enabled = true) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	useEffect(() => {
		if (enabled && visible && id !== "new" && repository.subscribeLive)
			return repository.subscribeLive(id);
	}, [repository, id, enabled, visible]);
	return useQuery({
		queryKey: warehouseKeys.live(id),
		queryFn: ({ signal }) => {
			if (!repository.getLive)
				throw new Error("Поток состояния склада недоступен");
			return repository.getLive(id, signal);
		},
		enabled:
			enabled &&
			!repository.subscribeLive &&
			!!repository.getLive &&
			visible &&
			id !== "new",
		refetchInterval: visible && !repository.subscribeLive ? 1000 : false,
		staleTime: 1000,
		refetchOnWindowFocus: false,
	});
}

export function useWarehouseConnection(id: string) {
	return useQuery<boolean>({
		queryKey: warehouseKeys.connection(id),
		queryFn: skipToken,
	});
}

export function useSelectionSummary(
	id: string,
	keys: string[],
	enabled: boolean,
) {
	const repository = useWarehouseRepository();
	const ordered = [...keys].sort();
	return useQuery({
		queryKey: ["warehouses", id, "selection-summary", ordered],
		enabled: enabled && !!ordered.length && !!repository.selectionSummary,
		queryFn: ({ signal }) => {
			if (!repository.selectionSummary)
				throw new Error("Сводка выделения недоступна");
			return repository.selectionSummary(id, ordered, signal);
		},
		refetchInterval: 5000,
	});
}

export function useWarehouseResources(
	warehouse: Warehouse,
	resources: WarehouseResource[],
) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	const queries = useQueries({
		queries: resources.map((resource) => ({
			queryKey: warehouseKeys.resource(warehouse.id, resource),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				repository.get(warehouse.id, signal, resource),
			enabled: visible,
			refetchInterval: visible ? 5000 : false,
		})),
	});
	const merged = { ...warehouse };
	queries.forEach((query, index) => {
		const resource = resources[index];
		if (query.data && resource)
			Object.assign(merged, warehouseResourceData(resource, query.data));
	});
	return {
		warehouse: merged,
		hasData: queries.every((query) => query.data !== undefined),
		loading: queries.some((query) => query.isPending),
		error: queries.find((query) => query.isError)?.error,
		fetching: queries.some((query) => query.isFetching),
		retry: () => Promise.all(queries.map((query) => query.refetch())),
	};
}

export function useLiveWarehouseScope(includeMotion = true) {
	const scope = useWarehouseScope();
	const live = useWarehouseLiveUpdates(scope.warehouse.id);
	if (!includeMotion) return scope;

	return {
		...scope,
		warehouse: {
			...scope.warehouse,
			...selectWarehouseMotion(scope.warehouse, live.data),
		},
		pending: scope.pending || live.isError,
	};
}
