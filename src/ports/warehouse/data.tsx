import { createContext, useContext } from "react";
import type {
	BlockRoutePlan,
	Cell,
	Order,
	Warehouse,
	WarehouseCommand,
	WarehouseInput,
} from "@/domain/warehouse";
import type { UseMutationResult, UseQueryResult } from "@/shared/query";
import type { WarehouseResource } from "./index";
import type { LayoutOperation } from "./layout";
import { selectWarehouseScope, type WarehouseScope } from "./warehouseScope";

export interface MutationReceipt {
	id: string;
	applied: true;
}

type WarehouseMutation<Input, Output = MutationReceipt> = UseMutationResult<
	Output,
	Error,
	Input
>;

export interface WarehouseData {
	useScopeId(): string;
	useLayoutOperation(id: string): {
		operation: LayoutOperation | null;
		retryRead(): Promise<void>;
		discardRejected(): void;
	};
	useWarehouses(): UseQueryResult<Warehouse[]>;
	useWarehouse(id: string): UseQueryResult<Warehouse>;
	useWarehouseConnection(id: string): UseQueryResult<boolean>;
	useWarehouseLiveSubscription(id: string): void;
	useOrder(id: string, orderId: string | null): UseQueryResult<Order>;
	useSelectionSummary(
		id: string,
		keys: string[],
		enabled: boolean,
	): UseQueryResult<{ capacity: number; batchCount: number }>;
	useWarehouseResources<Snapshot extends Pick<Warehouse, "id">>(
		warehouse: Snapshot,
		resources: WarehouseResource[],
	): {
		warehouse: Snapshot;
		hasData: boolean;
		loading: boolean;
		error: Error | undefined;
		fetching: boolean;
		retry(): Promise<unknown>;
	};
	useLiveWarehouseScope(): WarehouseScope;
	useWarehouseCommand(
		id: string,
		fallbackWarehouse?: Warehouse,
	): WarehouseMutation<WarehouseCommand & { operationId?: string | undefined }>;
	useCreateWarehouse(): WarehouseMutation<WarehouseInput>;
	useRouteProposal(id: string): WarehouseMutation<Cell[], BlockRoutePlan[]>;
	useWarehouseCache(): {
		getSnapshot(id: string): Warehouse | undefined;
		getWarehouses(): Warehouse[] | undefined;
		hasReadError(id: string): boolean;
	};
}

const Context = createContext<WarehouseData | null>(null);
export const WarehouseDataProvider = Context.Provider;

function useData() {
	const data = useContext(Context);
	if (!data) throw new Error("WarehouseDataProvider is missing");

	return data;
}

export function useWarehouses() {
	return useData().useWarehouses();
}

export function useWarehouse(id: string) {
	return useData().useWarehouse(id);
}

export function useWarehouseConnection(id: string) {
	return useData().useWarehouseConnection(id);
}

export function useWarehouseLiveSubscription(id: string) {
	return useData().useWarehouseLiveSubscription(id);
}

export function useOrder(id: string, orderId: string | null) {
	return useData().useOrder(id, orderId);
}

export function useSelectionSummary(
	id: string,
	keys: string[],
	enabled: boolean,
) {
	return useData().useSelectionSummary(id, keys, enabled);
}

export function useWarehouseResources<Snapshot extends Pick<Warehouse, "id">>(
	warehouse: Snapshot,
	resources: WarehouseResource[],
) {
	return useData().useWarehouseResources(warehouse, resources);
}

export function useLiveWarehouseScreen<Key extends keyof Warehouse>(
	fields: readonly Key[],
) {
	return selectWarehouseScope(useData().useLiveWarehouseScope(), fields);
}

export function useWarehouseCommand(id: string, fallbackWarehouse?: Warehouse) {
	return useData().useWarehouseCommand(id, fallbackWarehouse);
}

export function useCreateWarehouse() {
	return useData().useCreateWarehouse();
}

export function useRouteProposal(id: string) {
	return useData().useRouteProposal(id);
}

export function useWarehouseCache() {
	return useData().useWarehouseCache();
}

export function useLayoutOperation(id: string) {
	return useData().useLayoutOperation(id);
}

export function useWarehouseScopeId() {
	return useData().useScopeId();
}
