import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse";
import type { MutationReceipt } from "../repositories/repository";
import { useWarehouseRepository } from "../WarehouseRepositoryProvider";
import { mutationIdentity } from "./mutationIdentity";
import { warehouseKeys } from "./queryKeys";
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
