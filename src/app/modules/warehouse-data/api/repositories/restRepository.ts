import { QueryClient } from "@tanstack/react-query";
import type {
	Warehouse,
	WarehouseCommand,
	WarehouseInput,
} from "@/domain/warehouse";
import {
	blockRoutePlanSchema,
	selectionSummarySchema,
} from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import { isLayoutCommand } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import { serializeLayoutCells } from "../layout/layoutCells";
import { LayoutResource } from "../../model/layout/layoutResource";
import { WarehouseLiveSubscriptions } from "../live/warehouseLiveSubscriptions";
import { orderDto } from "../orders/orderDto";
import { createWarehouseKeys } from "../../model/queries/queryKeys";
import { commandResources } from "../../model/queries/resources";
import { createdWarehouseDto, warehouseDto } from "../warehouses/warehouseDto";
import { executeWarehouseCommand } from "./executeWarehouseCommand";
import { warehouseSessionHttp } from "./warehouseSessionHttp";
import { readWarehouseCollection } from "./readWarehouseCollection";
import type { MutationOptions, WarehouseRepository } from "./repository";
import { orderFromDto, warehouseFromDto } from "./restMappers";
import { RestWarehouseSnapshots } from "./restWarehouseSnapshots";
import { WarehouseMutationRequests } from "./warehouseMutationRequests";

export class RestWarehouseRepository implements WarehouseRepository {
	private readonly http: HttpClient;
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
		http: HttpClient,
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
		);
		this.live = new WarehouseLiveSubscriptions(
			this.http,
			this.cache,
			() => this.keys,
			{
				snapshotReady: (id) => this.snapshots.isReady(id),
				resync: (id, signal) => this.snapshots.readWarehouse(id, signal, "map"),
				poll: (id, signal) => this.snapshots.getLive(id, signal),
				onIdle: (id) => this.snapshots.forgetMapState(id),
			},
		);
		this.mutations = new WarehouseMutationRequests(this.http, sessionSignal);
		this.layout = new LayoutResource(
			this.cache,
			sessionSignal,
			() => this.keys,
			async (id, signal) => {
				this.snapshots.invalidateLayout(id);
				this.live.invalidate(id);
				await this.cache.cancelQueries({
					queryKey: this.keys.resources(id),
				});
				signal.throwIfAborted();
				const snapshot = await this.snapshots.readWarehouse(id, signal, "map");
				signal.throwIfAborted();
				this.cache.setQueryData(this.keys.resource(id, "map"), snapshot);
				this.cache.setQueryData(this.keys.resource(id, "metadata"), snapshot);
			},
		);
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
		return this.snapshots.getLive(id, signal);
	}

	async getOrder(
		id: string,
		orderId: string,
		signal?: AbortSignal | undefined,
	) {
		return orderFromDto(
			parseResponse(
				orderDto,
				await this.http.request(
					`/warehouses/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}`,
					{ signal },
				),
			),
		);
	}

	async list(signal?: AbortSignal | undefined) {
		return (
			await readWarehouseCollection(
				this.http,
				"/warehouses?include_summary=true",
				warehouseDto,
				signal,
			)
		).map(warehouseFromDto);
	}

	async get(
		id: string,
		signal?: AbortSignal | undefined,
		resource: WarehouseResource = "all",
	) {
		return this.snapshots.readWarehouse(id, signal, resource, this.live);
	}

	async proposeRoutes(
		id: string,
		cells: Warehouse["cells"],
		signal?: AbortSignal | undefined,
	) {
		const zoneIds = new Set(
			this.cache
				.getQueryData<Warehouse>(this.keys.detail(id))
				?.cells.flatMap((c) => (c.zone ? [c.zone.id] : [])) ?? [],
		);
		return parseResponse(
			blockRoutePlanSchema.array(),
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/layout/routes/propose`,
				{
					method: "POST",
					readOnly: true,
					body: {
						cells: serializeLayoutCells(cells, zoneIds),
					},
					signal,
				},
			),
		);
	}
	async selectionSummary(
		id: string,
		keys: string[],
		signal?: AbortSignal | undefined,
	) {
		return parseResponse(
			selectionSummarySchema,
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/map/selection-summary`,
				{ method: "POST", readOnly: true, body: { cell_keys: keys }, signal },
			),
		);
	}

	async create(
		warehouse: WarehouseInput,
		options?: MutationOptions | undefined,
	) {
		const result = parseResponse(
			createdWarehouseDto,
			await this.mutations.send("/warehouses", {
				method: "POST",
				idempotencyKey: options?.operationId,
				body: {
					name: warehouse.name,
					width: warehouse.width,
					height: warehouse.height,
					time_zone: warehouse.timezone,
				},
			}),
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
		const warehouse =
			options?.warehouse ??
			this.cache.getQueryData<Warehouse>(this.keys.detail(id));

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
