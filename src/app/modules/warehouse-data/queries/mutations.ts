import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Warehouse, WarehouseCommand } from "@/domain/warehouse";
import { isLayoutCommand, type MutationReceipt } from "@/ports/warehouse";
import { useWarehouseRepository } from "../WarehouseRepositoryProvider";
import { mutationIdentity } from "./mutationIdentity";
import { commandResources } from "./resources";

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

export function useWarehouseCommand(id: string, fallbackWarehouse?: Warehouse) {
	const operation = useRef({ signature: "", id: crypto.randomUUID() });
	const active = useActiveRepository();
	const repository = useWarehouseRepository();
	const warehouseKeys = repository.keys;
	const cache = useQueryClient();
	const session = repository.getSessionSignal();

	return useMutation({
		mutationFn: async (
			command: WarehouseCommand & { operationId?: string | undefined },
		) => {
			const signature = JSON.stringify(command);
			if (operation.current.signature !== signature)
				operation.current = { signature, id: crypto.randomUUID() };
			const snapshot = cache.getQueryData<Warehouse>(warehouseKeys.detail(id));
			const warehouse =
				fallbackWarehouse &&
				(!snapshot ||
					(fallbackWarehouse.revision ?? -1) > (snapshot.revision ?? -1))
					? fallbackWarehouse
					: snapshot;
			const operationId = command.operationId
				? await mutationIdentity(
						command.operationId,
						JSON.stringify([command.action, command.value]),
					)
				: operation.current.id;
			session.throwIfAborted();
			const result = await repository.execute(id, command, {
				operationId,
				warehouse,
			});
			operation.current = { signature: "", id: crypto.randomUUID() };
			if (!active.current)
				throw new DOMException("Источник данных изменился", "AbortError");
			return result;
		},
		onMutate: () =>
			cache.cancelQueries({ queryKey: warehouseKeys.resources(id) }),
		onError: async (_error, command) => {
			if (!active.current || session.aborted || isLayoutCommand(command))
				return;

			await cache.invalidateQueries({
				queryKey: warehouseKeys.resources(id),
			});
			if (command.action === "deleteWarehouse")
				await cache.invalidateQueries({
					queryKey: warehouseKeys.all,
					exact: true,
				});
		},
		onSuccess: async (_data: MutationReceipt, command) => {
			if (!active.current || session.aborted || isLayoutCommand(command))
				return;

			if (command.action === "deleteWarehouse") {
				const detail = { queryKey: warehouseKeys.warehouse(id) };
				const list = { queryKey: warehouseKeys.all, exact: true };
				await Promise.all([
					cache.cancelQueries(detail),
					cache.cancelQueries(list),
				]);
				if (!active.current || session.aborted) return;

				cache.removeQueries(detail);
				cache.setQueryData<Warehouse[]>(warehouseKeys.all, (warehouses) =>
					warehouses?.filter((warehouse) => warehouse.id !== id),
				);
				void cache.invalidateQueries(list);
				return;
			}

			await Promise.all([
				...commandResources(command.action).map((resource) =>
					cache.invalidateQueries({
						queryKey: warehouseKeys.resource(id, resource),
					}),
				),
				cache.invalidateQueries({ queryKey: warehouseKeys.live(id) }),
				cache.invalidateQueries({ queryKey: warehouseKeys.orders(id) }),
				cache.invalidateQueries({
					queryKey: warehouseKeys.selectionSummaries(id),
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
	const warehouseKeys = repository.keys;
	const cache = useQueryClient();
	const session = repository.getSessionSignal();

	return useMutation({
		mutationFn: async (input: Parameters<typeof repository.create>[0]) => {
			const signature = JSON.stringify(input);
			if (operation.current.signature !== signature)
				operation.current = { signature, id: crypto.randomUUID() };
			session.throwIfAborted();
			const result = await repository.create(input, {
				operationId: operation.current.id,
			});
			operation.current = { signature: "", id: crypto.randomUUID() };
			if (!active.current)
				throw new DOMException("Источник данных изменился", "AbortError");
			return result;
		},
		onSuccess: () => {
			if (active.current && !session.aborted)
				return cache.invalidateQueries({
					queryKey: warehouseKeys.all,
					exact: true,
				});
		},
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
