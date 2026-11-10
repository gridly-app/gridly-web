import type {
	WarehouseCommand,
	WarehouseInput,
} from "../../model/commands/commands";
import type {
	Order,
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";
import type { WarehouseResource } from "../queries/resources";

export interface MutationReceipt {
	id: string;
	applied: true;
}

export interface MutationOptions {
	operationId: string;
	warehouse?: Warehouse | undefined;
}

export interface WarehouseRepository {
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
