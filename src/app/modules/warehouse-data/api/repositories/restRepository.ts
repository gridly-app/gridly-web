import { QueryClient } from "@tanstack/react-query";
import {
	isLayoutCommand,
	type Cell,
	type WarehouseCommand,
	type WarehouseInput,
} from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import type { StreamHttpClient } from "@/shared/http";
import { proposeRoutes, readSelectionSummary } from "../layout/layoutRequests";
import { LayoutResource } from "../../model/layout/layoutResource";
import { WarehouseLiveSubscriptions } from "../live/warehouseLiveSubscriptions";
import { readOrder } from "../orders/orderRequests";
import { createWarehouseKeys } from "../../model/queries/queryKeys";
import { commandResources } from "../../model/queries/resources";
import {
	createWarehouse,
	readWarehouses,
} from "../warehouses/warehouseRequests";
import { executeWarehouseCommand } from "./executeWarehouseCommand";
import { warehouseSessionHttp } from "./warehouseSessionHttp";
import type { MutationOptions, WarehouseRepository } from "./repository";
import { RestWarehouseSnapshots } from "./restWarehouseSnapshots";
import { WarehouseMutationRequests } from "./warehouseMutationRequests";

export class RestWarehouseRepository implements WarehouseRepository {
	private readonly http: StreamHttpClient;
	private readonly live: WarehouseLiveSubscriptions;
	private readonly snapshots: RestWarehouseSnapshots;
	private readonly mutations: WarehouseMutationRequests;
	private readonly layout: LayoutResource;

	private session = new AbortController();
	private scopeKeys = createWarehouseKeys(crypto.randomUUID());

	get keys() {
		return this.scopeKeys;
	}

	constructor(
		http: StreamHttpClient,
		private readonly cache = new QueryClient(),
		readTimeoutMs = 15_000,
	) {
		const sessionSignal = () => this.session.signal;
		this.http = warehouseSessionHttp(http, sessionSignal);
		this.snapshots = new RestWarehouseSnapshots(
			this.http,
			this.cache,
			sessionSignal,
			() => this.keys,
			readTimeoutMs,
			(id) => this.live.invalidateIfHealthy(id),
		);
		this.live = new WarehouseLiveSubscriptions(
			this.http,
			this.cache,
			() => this.keys,
			{
				resync: (id, signal) => this.snapshots.resyncLive(id, signal),
				poll: (id, signal) => this.snapshots.getLive(id, signal),
			},
		);
		this.mutations = new WarehouseMutationRequests(this.http, sessionSignal);
		this.layout = new LayoutResource(
			this.cache,
			sessionSignal,
			() => this.keys,
			(id, signal) => this.rereadLayout(id, signal),
		);
	}

	private async rereadLayout(id: string, signal: AbortSignal) {
		this.snapshots.invalidateLayout(id);
		this.live.invalidate(id);
		await this.cache.cancelQueries({ queryKey: this.keys.resources(id) });
		signal.throwIfAborted();

		await this.snapshots.read(id, "map", signal);
	}

	getSessionSignal() {
		return this.session.signal;
	}

	async retryLayoutRead(id: string) {
		const { signal } = this.session;
		const keys = this.keys;
		const command = await this.layout.retryRead(id);

		signal.throwIfAborted();

		if (command) await this.invalidateLayoutRelated(keys, id, command.action);
	}

	discardRejectedLayout(id: string) {
		this.layout.discardRejected(id);
	}

	clear() {
		this.live.clear();
		this.snapshots.clear();
		this.session.abort();
		this.session = new AbortController();
		const previous = this.scopeKeys;
		this.scopeKeys = createWarehouseKeys(crypto.randomUUID());
		this.cache.removeQueries({ queryKey: previous.all });
		this.cache.removeQueries({ queryKey: previous.layoutOperations });
		this.mutations.clear();
		this.layout.clear();
	}

	subscribeLive(id: string) {
		return this.live.subscribe(id);
	}

	getLive(id: string, signal?: AbortSignal) {
		return this.snapshots.isReady(id)
			? this.snapshots.getLive(id, signal)
			: this.snapshots.resyncLive(id, signal);
	}

	getOrder(id: string, orderId: string, signal?: AbortSignal | undefined) {
		return readOrder(this.http, id, orderId, signal);
	}

	list(signal?: AbortSignal | undefined) {
		return readWarehouses(this.http, signal);
	}

	get<Resource extends WarehouseResource>(
		id: string,
		signal: AbortSignal | undefined,
		resource: Resource,
	) {
		return this.snapshots.read(id, resource, signal);
	}

	proposeRoutes(id: string, cells: Cell[], signal?: AbortSignal | undefined) {
		const map = this.cache.getQueryData(this.keys.resource(id, "map"));

		if (!map) throw new Error("Сначала загрузите планировку склада");
		const zoneIds = new Set(
			map.cells.flatMap((cell) => (cell.zone ? [cell.zone.id] : [])),
		);

		return proposeRoutes(this.http, id, cells, zoneIds, signal);
	}

	selectionSummary(
		id: string,
		keys: string[],
		signal?: AbortSignal | undefined,
	) {
		return readSelectionSummary(this.http, id, keys, signal);
	}

	async create(
		warehouse: WarehouseInput,
		options?: MutationOptions | undefined,
	) {
		const result = await createWarehouse(
			this.mutations,
			warehouse,
			options?.operationId,
		);

		return { id: result.id, applied: true as const };
	}

	async execute(
		id: string,
		command: WarehouseCommand,
		options?: MutationOptions | undefined,
	) {
		const session = this.session.signal;
		const keys = this.keys;
		const metadata = this.cache.getQueryData(keys.resource(id, "metadata"));
		const fallback = options?.warehouse;
		const warehouse =
			fallback &&
			(!metadata || (fallback.revision ?? -1) > (metadata.revision ?? -1))
				? fallback
				: metadata;

		if (!warehouse) {
			throw new Error("Сначала синхронизируйте склад");
		}
		const execute = (
			input: WarehouseCommand,
			markSent?: (retry?: () => Promise<unknown>) => void,
		) =>
			executeWarehouseCommand({
				http: this.http,
				mutations: this.mutations,
				cache: this.cache,
				keys,
				id,
				input,
				warehouse,
				operationId: options?.operationId,
				session,
				markSent,
			});

		if (isLayoutCommand(command)) {
			await this.layout.execute(id, command, execute);
			session.throwIfAborted();

			await this.invalidateLayoutRelated(keys, id, command.action);
			session.throwIfAborted();
		} else {
			await execute(command);
		}

		return { id, applied: true as const };
	}

	private async invalidateLayoutRelated(
		keys: typeof this.keys,
		id: string,
		action: WarehouseCommand["action"],
	) {
		const resources = commandResources(action);
		const relatedResources = resources.filter(
			(resource) => resource !== "map" && resource !== "metadata",
		);
		const related = relatedResources.map((resource) =>
			keys.resource(id, resource),
		);

		await Promise.all(
			[
				...related,
				keys.live(id),
				keys.orders(id),
				keys.selectionSummaries(id),
				keys.all,
			].map((queryKey) =>
				this.cache.invalidateQueries({
					queryKey,
					exact: queryKey === keys.all,
				}),
			),
		);
	}
}
