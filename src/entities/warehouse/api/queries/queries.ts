import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { usePageVisible } from "@/shared/lib";
import type { WarehouseCommand } from "../../model/commands/commands";
import type {
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";
import { useWarehouseRepository } from "../context/context";
import { isApplicableLiveState } from "../repositories/mergeLiveState";
import type { MutationReceipt } from "../repositories/repository";
import { mutationIdentity } from "./mutationIdentity";
import { warehouseKeys } from "./queryKeys";
import {
	commandResources,
	resourceFields,
	type WarehouseResource,
} from "./resources";

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

export function useWarehouseLivePolling(id: string, enabled = true) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	return useQuery({
		queryKey: warehouseKeys.live(id),
		queryFn: ({ signal }) => {
			if (!repository.getLive)
				throw new Error("Поток состояния склада недоступен");
			return repository.getLive(id, signal);
		},
		enabled: enabled && !!repository.getLive && visible && id !== "new",
		refetchInterval: visible ? 250 : false,
		staleTime: 250,
		refetchOnWindowFocus: false,
	});
}

export type WarehouseLiveSelector<T> = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => T;

export function warehouseLiveSelection<T>(
	snapshot: Warehouse,
	select: WarehouseLiveSelector<T>,
) {
	return (live: WarehouseLiveState) =>
		select(snapshot, isApplicableLiveState(snapshot, live) ? live : undefined);
}

export function useWarehouseLiveSelection<T>(
	snapshot: Warehouse,
	select: WarehouseLiveSelector<T>,
) {
	const repository = useWarehouseRepository();
	const selection = useMemo(
		() => warehouseLiveSelection(snapshot, select),
		[snapshot, select],
	);
	return useQuery({
		queryKey: warehouseKeys.live(snapshot.id),
		queryFn: ({ signal }) => {
			if (!repository.getLive)
				throw new Error("Поток состояния склада недоступен");
			return repository.getLive(snapshot.id, signal);
		},
		enabled: false,
		select: selection,
	});
}

function useActiveRepository() {
	const active = useRef(true);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	return active;
}
export function useWarehouseCommand(id: string) {
	const operation = useRef({ signature: "", id: crypto.randomUUID() });
	const active = useActiveRepository();
	const repository = useWarehouseRepository();
	const cache = useQueryClient();

	return useMutation({
		mutationFn: async (
			command: WarehouseCommand & { operationId?: string | undefined },
		) => {
			const signature = JSON.stringify(command);
			if (operation.current.signature !== signature)
				operation.current = { signature, id: crypto.randomUUID() };
			const result = await repository.execute(id, command, {
				operationId: command.operationId
					? await mutationIdentity(
							command.operationId,
							JSON.stringify([command.action, command.value]),
						)
					: operation.current.id,
				warehouse: cache.getQueryData<Warehouse>(warehouseKeys.detail(id)),
			});
			operation.current = { signature: "", id: crypto.randomUUID() };
			if (!active.current)
				throw new DOMException("Источник данных изменился", "AbortError");
			return result;
		},
		onMutate: () =>
			cache.cancelQueries({ queryKey: ["warehouses", id, "resource"] }),
		onError: () => {
			if (active.current)
				return cache.invalidateQueries({
					queryKey: ["warehouses", id, "resource"],
				});
		},
		onSuccess: async (_data: MutationReceipt, command) => {
			if (!active.current) return;

			await Promise.all([
				...commandResources(command.action).map((resource) =>
					cache.invalidateQueries({
						queryKey: warehouseKeys.resource(id, resource),
					}),
				),
				cache.invalidateQueries({ queryKey: warehouseKeys.live(id) }),
				cache.invalidateQueries({ queryKey: warehouseKeys.orders(id) }),
				cache.invalidateQueries({
					queryKey: ["warehouses", id, "selection-summary"],
				}),
				cache.invalidateQueries({ queryKey: warehouseKeys.all, exact: true }),
			]);
		},
	});
}

export function useCreateWarehouse() {
	const operation = useRef({ signature: "", id: crypto.randomUUID() });
	const active = useActiveRepository();
	const repository = useWarehouseRepository();
	const cache = useQueryClient();

	return useMutation({
		mutationFn: async (input: Parameters<typeof repository.create>[0]) => {
			const signature = JSON.stringify(input);
			if (operation.current.signature !== signature)
				operation.current = { signature, id: crypto.randomUUID() };
			const result = await repository.create(input, {
				operationId: operation.current.id,
			});
			operation.current = { signature: "", id: crypto.randomUUID() };
			if (!active.current)
				throw new DOMException("Источник данных изменился", "AbortError");
			return result;
		},
		onSuccess: () => {
			if (active.current)
				return cache.invalidateQueries({
					queryKey: warehouseKeys.all,
					exact: true,
				});
		},
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

export function useRouteProposal(id: string) {
	const repository = useWarehouseRepository();
	return useMutation({
		mutationFn: async (cells: Warehouse["cells"]) => {
			if (!repository.proposeRoutes)
				throw new Error("Построение маршрутов недоступно");
			return repository.proposeRoutes(id, cells);
		},
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
			Object.assign(
				merged,
				Object.fromEntries(
					resourceFields[resource].map((key) => [key, query.data?.[key]]),
				),
			);
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
