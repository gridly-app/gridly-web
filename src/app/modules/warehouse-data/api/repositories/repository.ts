import type {
	Order,
	BlockRoutePlan,
	Cell,
	WarehouseResourceTypes,
	Warehouse,
	WarehouseCommand,
	WarehouseInput,
	WarehouseLiveState,
} from "@/domain/warehouse";
import type { MutationReceipt, WarehouseResource } from "@/ports/warehouse";

import type { WarehouseKeys } from "../../model/queries/queryKeys";

export interface MutationOptions {
	operationId: string;
	warehouse?: Warehouse | undefined;
}

export interface WarehouseRepository {
	readonly keys: WarehouseKeys;
	getSessionSignal(): AbortSignal;
	retryLayoutRead(id: string): Promise<void>;
	discardRejectedLayout(id: string): void;
	subscribeLive(id: string): () => void;
	proposeRoutes(
		id: string,
		cells: Cell[],
		signal?: AbortSignal | undefined,
	): Promise<BlockRoutePlan[]>;
	selectionSummary(
		id: string,
		keys: string[],
		signal?: AbortSignal | undefined,
	): Promise<{ capacity: number; batchCount: number }>;
	getLive(
		id: string,
		signal?: AbortSignal | undefined,
	): Promise<WarehouseLiveState>;
	clear(): void;
	getOrder(
		id: string,
		orderId: string,
		signal?: AbortSignal | undefined,
	): Promise<Order>;
	list(signal?: AbortSignal | undefined): Promise<Warehouse[]>;
	get<Resource extends WarehouseResource>(
		id: string,
		signal: AbortSignal | undefined,
		resource: Resource,
	): Promise<WarehouseResourceTypes[Resource]>;
	create(
		warehouse: WarehouseInput,
		options?: MutationOptions | undefined,
	): Promise<MutationReceipt>;
	execute(
		id: string,
		command: WarehouseCommand,
		options?: MutationOptions | undefined,
	): Promise<MutationReceipt>;
}
