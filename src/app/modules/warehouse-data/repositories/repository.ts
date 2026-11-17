import type {
	Order,
	Warehouse,
	WarehouseCommand,
	WarehouseInput,
	WarehouseLiveState,
} from "@/domain/warehouse";
import type { MutationReceipt, WarehouseResource } from "@/ports/warehouse";

import type { WarehouseKeys } from "../queries/queryKeys";

export interface MutationOptions {
	operationId: string;
	warehouse?: Warehouse | undefined;
}

export interface WarehouseRepository {
	readonly keys: WarehouseKeys;
	getSessionSignal(): AbortSignal;
	retryLayoutRead(id: string): Promise<void>;
	discardRejectedLayout(id: string): void;
	subscribeLive?(id: string): () => void;
	proposeRoutes?(
		id: string,
		cells: Warehouse["cells"],
		signal?: AbortSignal | undefined,
	): Promise<NonNullable<Warehouse["routePlans"]>>;
	selectionSummary?(
		id: string,
		keys: string[],
		signal?: AbortSignal | undefined,
	): Promise<{ capacity: number; batchCount: number }>;
	getLive?(
		id: string,
		signal?: AbortSignal | undefined,
	): Promise<WarehouseLiveState>;
	clear?(): void;
	getOrder?(
		id: string,
		orderId: string,
		signal?: AbortSignal | undefined,
	): Promise<Order>;
	list(signal?: AbortSignal | undefined): Promise<Warehouse[]>;
	get(
		id: string,
		signal?: AbortSignal | undefined,
		resource?: WarehouseResource | undefined,
	): Promise<Warehouse>;
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
