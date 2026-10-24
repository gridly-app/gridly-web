import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { usePageVisible } from "@/shared/lib";
import type { WarehouseCommand } from "../../model/commands/commands";
import type {
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";
import { useWarehouseRepository } from "../context/context";
import { isApplicableLiveState } from "../repositories/mergeLiveState";
import { warehouseKeys } from "./queryKeys";

export function useOrder(id: string, orderId: string | null) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();

	return useQuery({
		queryKey: warehouseKeys.order(id, orderId),
		queryFn: ({ signal }) => {
			if (!orderId || !repository.getOrder) {
				throw new Error("Загрузка заказа недоступна");
			}
			return repository.getOrder(id, orderId, signal);
		},
		networkMode: repository.networkMode,
		enabled: !!orderId && !!repository.getOrder && visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});
}

export function useWarehouses() {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();

	return useQuery({
		queryKey: warehouseKeys.all,
		queryFn: ({ signal }) => repository.list(signal),
		networkMode: repository.networkMode,
		refetchInterval: visible ? 5000 : false,
		enabled: visible,
	});
}

export function useWarehouse(id: string) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	const snapshot = useQuery({
		queryKey: warehouseKeys.detail(id),
		queryFn: ({ signal }) => repository.get(id, signal),
		networkMode: repository.networkMode,
		enabled: id !== "new" && visible,
		refetchInterval: visible ? 5000 : false,
		refetchOnMount: "always",
	});
	return snapshot;
}

export function useWarehouseLivePolling(id: string) {
	const repository = useWarehouseRepository();
	const visible = usePageVisible();
	return useQuery({
		queryKey: warehouseKeys.live(id),
		queryFn: ({ signal }) => {
			if (!repository.getLive)
				throw new Error("Поток состояния склада недоступен");
			return repository.getLive(id, signal);
		},
		networkMode: repository.networkMode,
		enabled: !!repository.getLive && visible && id !== "new",
		refetchInterval: visible ? 250 : false,
		staleTime: 250,
		refetchOnWindowFocus: false,
	});
}

export type WarehouseLiveSelector<T> = (
	snapshot: Warehouse,
	live?: WarehouseLiveState,
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
	const selection = useMemo(
		() => warehouseLiveSelection(snapshot, select),
		[snapshot, select],
	);
	return useQuery({
		queryKey: warehouseKeys.live(snapshot.id),
		enabled: false,
		select: selection,
	});
}

export function useWarehouseCommand(id: string) {
	const repository = useWarehouseRepository();
	const cache = useQueryClient();

	return useMutation({
		mutationFn: (command: WarehouseCommand) => repository.execute(id, command),
		networkMode: repository.networkMode,
		onMutate: () => cache.cancelQueries({ queryKey: warehouseKeys.detail(id) }),
		onError: () =>
			cache.invalidateQueries({ queryKey: warehouseKeys.detail(id) }),
		onSuccess: async (data) => {
			cache.setQueryData(warehouseKeys.detail(id), data);
			await Promise.all([
				cache.invalidateQueries({ queryKey: warehouseKeys.live(id) }),
				cache.invalidateQueries({ queryKey: warehouseKeys.orders(id) }),
				cache.invalidateQueries({ queryKey: warehouseKeys.all, exact: true }),
			]);
		},
	});
}

export function useCreateWarehouse() {
	const repository = useWarehouseRepository();
	const cache = useQueryClient();

	return useMutation({
		mutationFn: repository.create.bind(repository),
		networkMode: repository.networkMode,
		onSuccess: () =>
			cache.invalidateQueries({ queryKey: warehouseKeys.all, exact: true }),
	});
}
