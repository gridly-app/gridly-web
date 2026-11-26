import { skipToken, useQueries, useQuery } from "@tanstack/react-query";
import { newWarehouseId } from "@/ports/navigation";
import { useEffect } from "react";
import {
	isApplicableLiveState,
	mergeRobotPositions,
	type Warehouse,
	type WarehouseLiveState,
	type WarehouseResource,
	type WarehouseResourceData,
} from "@/domain/warehouse";
import { useWarehouseScope } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { usePageVisible } from "@/shared/lib";
import { useWarehouseRepository } from "../../WarehouseRepositoryProvider";

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

	return query;
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

export function useWarehouseResources<
	Snapshot extends Pick<Warehouse, "id">,
	Resource extends WarehouseResource,
>(warehouse: Snapshot, resources: readonly Resource[]) {
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
	const loaded = queries.flatMap(({ data }) => (data ? [data] : []));
	const data: (Snapshot & WarehouseResourceData<Resource>) | undefined =
		loaded.length === resources.length
			? Object.assign({}, warehouse, ...loaded)
			: undefined;
	const denied = queries
		.map((query) => query.error ?? query.failureReason)
		.find((error) => error instanceof ApiError && error.status === 403);

	return {
		data,
		loading: queries.some((query) => query.isPending),
		error: denied ?? queries.find((query) => query.isError)?.error,
		fetching: queries.some((query) => query.isFetching),
		retry: () => Promise.all(queries.map((query) => query.refetch())),
	};
}

export function useLiveWarehouseScope() {
	const scope = useWarehouseScope();
	const live = useWarehouseLiveUpdates(scope.warehouse.id);
	const { warehouse } = scope;

	if (!isApplicableLiveState(warehouse, live.data)) return scope;

	const { asOf, tick, stateVersion } = live.data;
	const robots = warehouse.robots
		? { robots: mergeRobotPositions(warehouse.robots, live.data.robots) }
		: undefined;

	return {
		...scope,
		warehouse: {
			...warehouse,
			asOf: asOf ?? warehouse.asOf,
			tick,
			stateVersion,
			...robots,
		},
	};
}
