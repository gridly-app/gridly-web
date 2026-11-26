import { skipToken, useQueries, useQuery } from "@tanstack/react-query";
import { newWarehouseId } from "@/ports/navigation";
import { useEffect } from "react";
import type { Warehouse, WarehouseLiveState } from "@/domain/warehouse";
import { selectWarehouseMotion } from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import { useWarehouseScope } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { usePageVisible } from "@/shared/lib";
import { useWarehouseRepository } from "../../WarehouseRepositoryProvider";
import { warehouseResourceData } from "./resources";

export function useOrder(id: string, orderId: string | null) {
	const repository = useWarehouseRepository();
	const warehouseKeys = repository.keys;
	const visible = usePageVisible();

	const query = useQuery({
		queryKey: warehouseKeys.order(id, orderId),
		queryFn: orderId
			? ({ signal }) => repository.getOrder(id, orderId, signal)
			: skipToken,
		enabled: visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});

	return { ...query, supported: true };
}

export function useWarehouses() {
	const repository = useWarehouseRepository();
	const warehouseKeys = repository.keys;
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
	const warehouseKeys = repository.keys;
	const visible = usePageVisible();
	const snapshot = useQuery({
		queryKey: warehouseKeys.resource(id, "metadata"),
		queryFn: ({ signal }) => repository.get(id, signal, "metadata"),
		enabled: id !== newWarehouseId && visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});
	return snapshot;
}

export function useWarehouseLiveSubscription(id: string) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	useEffect(() => {
		if (visible && id !== newWarehouseId) return repository.subscribeLive(id);
	}, [repository, id, visible]);
}

function useWarehouseLiveUpdates(id: string) {
	const { keys: warehouseKeys } = useWarehouseRepository();

	return useQuery<WarehouseLiveState>({
		queryKey: warehouseKeys.live(id),
		queryFn: skipToken,
	});
}

export function useWarehouseConnection(id: string) {
	const { keys: warehouseKeys } = useWarehouseRepository();
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
	const warehouseKeys = repository.keys;
	const ordered = [...keys].sort();
	return useQuery({
		queryKey: warehouseKeys.selectionSummary(id, ordered),
		enabled: enabled && !!ordered.length,
		queryFn: ({ signal }) => repository.selectionSummary(id, ordered, signal),
		refetchInterval: 5000,
	});
}

export function useWarehouseResources<Snapshot extends Pick<Warehouse, "id">>(
	warehouse: Snapshot,
	resources: WarehouseResource[],
) {
	const repository = useWarehouseRepository();
	const warehouseKeys = repository.keys;
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
	const denied = queries
		.map((query) => query.error ?? query.failureReason)
		.find((error) => error instanceof ApiError && error.status === 403);

	return {
		warehouse: merged,
		hasData: queries.every((query) => query.data !== undefined),
		loading: queries.some((query) => query.isPending),
		error: denied ?? queries.find((query) => query.isError)?.error,
		fetching: queries.some((query) => query.isFetching),
		retry: () => Promise.all(queries.map((query) => query.refetch())),
	};
}

export function useLiveWarehouseScope() {
	const scope = useWarehouseScope();
	const live = useWarehouseLiveUpdates(scope.warehouse.id);
	return {
		...scope,
		warehouse: {
			...scope.warehouse,
			...selectWarehouseMotion(scope.warehouse, live.data),
		},
		pending: scope.pending || live.isError,
	};
}
