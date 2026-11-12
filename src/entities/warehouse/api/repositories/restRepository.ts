import { QueryClient } from "@tanstack/react-query";
import {
	type HttpClient,
	parseResponse,
	type RequestOptions,
} from "@/shared/api";
import type {
	WarehouseCommand,
	WarehouseInput,
} from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse";
import {
	blockRoutePlanSchema,
	selectionSummarySchema,
} from "../../model/warehouse";
import { serializeLayoutCells } from "../commands/layoutCells";
import { RestWarehouseCommands } from "../commands/restCommands";
import { orderDto } from "../contracts/orderDto";
import { createdWarehouseDto, warehouseDto } from "../contracts/warehouseDto";
import { warehouseKeys } from "../queries/queryKeys";
import type { WarehouseResource } from "../queries/resources";
import { readWarehouseCollection } from "./readWarehouseCollection";
import type { MutationOptions, WarehouseRepository } from "./repository";
import { orderFromDto, warehouseFromDto } from "./restMappers";
import { RestWarehouseSnapshots } from "./restWarehouseSnapshots";
import { WarehouseLiveSubscriptions } from "./warehouseLiveSubscriptions";
import { WarehouseMutationRequests } from "./warehouseMutationRequests";

export class RestWarehouseRepository implements WarehouseRepository {
	private readonly http: HttpClient;
	private readonly live: WarehouseLiveSubscriptions;
	private readonly snapshots: RestWarehouseSnapshots;
	private readonly mutations: WarehouseMutationRequests;

	private session = new AbortController();
	constructor(
		http: HttpClient,
		private readonly cache = new QueryClient(),
		readTimeoutMs = 15_000,
	) {
		this.http = {
			...(http.openStream
				? {
						openStream: async (path: string, options: RequestOptions = {}) => {
							const signal = options.signal
								? AbortSignal.any([options.signal, this.session.signal])
								: this.session.signal;
							if (!http.openStream)
								throw new Error("Потоковый транспорт недоступен");
							const stream = await http.openStream(path, {
								...options,
								signal,
							});
							signal.throwIfAborted();
							return stream;
						},
					}
				: {}),
			request: async (path, options = {}) => {
				const controller = this.session;
				const signal = options.signal
					? AbortSignal.any([options.signal, controller.signal])
					: controller.signal;
				const result = await http.request(path, { ...options, signal });
				signal.throwIfAborted();
				return result;
			},
		};
		const sessionSignal = () => this.session.signal;
		this.snapshots = new RestWarehouseSnapshots(
			this.http,
			this.cache,
			sessionSignal,
			readTimeoutMs,
		);
		this.live = new WarehouseLiveSubscriptions(this.http, this.cache, {
			snapshotReady: (id) => this.snapshots.isReady(id),
			resync: (id, signal) => this.snapshots.readWarehouse(id, signal, "map"),
			poll: (id, signal) => this.snapshots.getLive(id, signal),
			onIdle: (id) => this.snapshots.forgetMapState(id),
		});
		this.mutations = new WarehouseMutationRequests(this.http, sessionSignal);
	}

	clear() {
		this.live.clear();
		this.snapshots.clear();
		this.session.abort();
		this.session = new AbortController();
		this.cache.removeQueries({ queryKey: warehouseKeys.all });
		this.mutations.clear();
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
				.getQueryData<Warehouse>(warehouseKeys.detail(id))
				?.cells.flatMap((c) => (c.zone ? [c.zone.id] : [])) ?? [],
		);
		return parseResponse(
			blockRoutePlanSchema.array(),
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/layout/routes/propose`,
				{
					method: "POST",
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
				{ method: "POST", body: { cell_keys: keys }, signal },
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
		const warehouse =
			options?.warehouse ??
			this.cache.getQueryData<Warehouse>(warehouseKeys.detail(id));

		if (!warehouse) {
			throw new Error("Сначала синхронизируйте склад");
		}
		const commands = new RestWarehouseCommands(
			this.http,
			(path, request, keyed) =>
				this.mutations.send(
					path,
					{
						...request,
						idempotencyKey: options
							? `${options.operationId}:${request.method ?? "POST"}:${path}`
							: undefined,
					},
					keyed,
				),
		);

		await commands.execute(id, command, warehouse);

		return { id, applied: true as const };
	}
}
