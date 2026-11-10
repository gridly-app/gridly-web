import { QueryClient } from "@tanstack/react-query";
import {
	ApiError,
	type HttpClient,
	parseResponse,
	type RequestOptions,
} from "@/shared/api";
import type {
	WarehouseCommand,
	WarehouseInput,
} from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse/schemas";
import {
	blockRoutePlanSchema,
	selectionSummarySchema,
} from "../../model/warehouse/schemas";
import { serializeLayoutCells } from "../commands/layoutCells";
import { RestWarehouseCommands } from "../commands/restCommands";
import {
	categoryDto,
	createdDto,
	eventDto,
	type LayoutDto,
	layoutDto,
	orderDto,
	productDto,
	robotDto,
	stockDto,
	warehouseDto,
	warehouseSettingsDto,
} from "../contracts/contract";
import { warehouseKeys } from "../queries/queryKeys";
import { resourceFields, type WarehouseResource } from "../queries/resources";
import { WarehouseLiveStream } from "./liveStream";
import { readMapState } from "./readMapState";
import { readWarehouseCollection } from "./readWarehouseCollection";
import type { MutationOptions, WarehouseRepository } from "./repository";
import {
	categoryFromDto,
	cellsFromDto,
	eventFromDto,
	orderFromDto,
	productFromDto,
	robotFromDto,
	stockFromDto,
	warehouseFromDto,
} from "./restMappers";

export class RestWarehouseRepository implements WarehouseRepository {
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

	private pendingKeys = new Map<string, string>();

	private generation = 0;

	private readonly http: HttpClient;
	private liveStreams = new Map<
		string,
		{ stream: WarehouseLiveStream; subscribers: number }
	>();
	private mapStateReady = new Map<string, number>();
	subscribeLive(id: string) {
		let entry = this.liveStreams.get(id);
		if (!entry) {
			const stream = new WarehouseLiveStream(
				{
					id,
					http: this.http,
					cache: this.cache,
					snapshotReady: () => {
						const snapshot = this.cache.getQueryData<Warehouse>(
							warehouseKeys.detail(id),
						);
						return (
							!!snapshot && this.mapStateReady.get(id) === snapshot.version
						);
					},
					resync: async (signal) => {
						const snapshot = await this.get(id, signal, "map", true);
						signal.throwIfAborted();
						this.cache.setQueryData(
							warehouseKeys.resource(id, "map"),
							snapshot,
						);
						void this.cache.invalidateQueries({
							queryKey: warehouseKeys.resource(id, "robots"),
						});
						return snapshot;
					},
					poll: (signal) => this.getLive(id, signal),
				},
				(error) => {
					this.cache.setQueryData(["warehouses", id, "connection"], { error });
				},
			);
			entry = { stream, subscribers: 0 };
			this.liveStreams.set(id, entry);
		}
		entry.subscribers++;
		entry.stream.start();
		let released = false;
		return () => {
			if (released) return;
			released = true;
			if (--entry.subscribers === 0) {
				entry.stream.stop();
				this.mapStateReady.delete(id);
				if (this.liveStreams.get(id) === entry) this.liveStreams.delete(id);
			}
		};
	}
	private session = new AbortController();
	constructor(
		http: HttpClient,
		private readonly cache = new QueryClient(),
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
	}

	clear() {
		for (const { stream } of this.liveStreams.values()) stream.stop();
		this.liveStreams.clear();
		this.mapStateReady.clear();
		this.session.abort();
		this.session = new AbortController();
		this.generation++;
		this.cache.removeQueries({ queryKey: warehouseKeys.all });
		this.pendingKeys.clear();
	}

	async getLive(id: string, signal?: AbortSignal | undefined) {
		const generation = this.generation;
		const warehouse = this.cache.getQueryData<Warehouse>(
			warehouseKeys.detail(id),
		);

		if (!warehouse) {
			throw new Error("Сначала загрузите склад");
		}
		const state = await readMapState(
			this.http,
			`/warehouses/${encodeURIComponent(id)}/map/state?after_version=${warehouse.stateVersion || "0"}`,
			{ signal },
		);

		this.assertActive(generation, signal);
		if (!state) {
			const latest =
				this.cache.getQueryData<Warehouse>(warehouseKeys.detail(id)) ||
				warehouse;
			return {
				layoutVersion: latest.version,
				stateVersion: latest.stateVersion,
				tick: latest.tick,
				robots: latest.robots,
				asOf: latest.asOf,
			};
		}
		if (state.warehouse_id !== id) {
			throw new Error("Получен снимок другого склада");
		}
		const latest =
			this.cache.getQueryData<Warehouse>(warehouseKeys.detail(id)) || warehouse;

		if (state.layout_version !== latest.version) {
			throw new Error("Карта изменилась. Дождитесь повторной синхронизации.");
		}

		if (BigInt(state.state_version) < BigInt(latest.stateVersion || "0")) {
			return {
				layoutVersion: latest.version,
				stateVersion: latest.stateVersion,
				tick: latest.tick,
				robots: latest.robots,
				asOf: latest.asOf,
			};
		}
		const positions = new Map((state?.robots ?? []).map((r) => [r.id, r]));
		const update = {
			layoutVersion: latest.version,
			stateVersion: String(
				state?.state_version ?? warehouse.stateVersion ?? "0",
			),
			tick: String(state?.tick ?? warehouse.tick),
			asOf: state.as_of,
			robots: latest.robots.map((robot) => ({
				...robot,
				x: positions.get(robot.id)?.x ?? robot.x,
				y: positions.get(robot.id)?.y ?? robot.y,
				status: positions.get(robot.id)?.status || robot.status,
				motionPath: positions.get(robot.id)?.motion_path,
			})),
		};

		this.cache.setQueryData(warehouseKeys.detail(id), { ...latest, ...update });

		return update;
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
		forceState = false,
	): Promise<Warehouse> {
		if (resource === "settings") {
			const generation = this.generation;
			const settings = parseResponse(
				warehouseSettingsDto,
				await this.http.request(
					`/warehouses/${encodeURIComponent(id)}/settings`,
					{ signal },
				),
			);
			this.assertActive(generation, signal);
			const warehouse = this.cache.getQueryData<Warehouse>(
				warehouseKeys.detail(id),
			);
			if (!warehouse) throw new Error("Сначала загрузите склад");
			const result = {
				...warehouse,
				settings:
					!warehouse.settings ||
					settings.revision >= warehouse.settings.revision
						? settings
						: warehouse.settings,
			};
			this.cache.setQueryData(warehouseKeys.detail(id), result);
			return result;
		}
		const needs = (name: WarehouseResource) =>
			resource === "all" || resource === name;
		const withMap = needs("map");
		const generation = this.generation;
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const d = parseResponse(
			warehouseDto,
			await this.http.request(base, { signal }),
		);

		this.assertActive(generation, signal);
		const warehouse = warehouseFromDto(d);
		const cached = this.cache.getQueryData<Warehouse>(warehouseKeys.detail(id));
		if (cached && cached.version !== warehouse.version)
			this.liveStreams.get(id)?.stream.invalidate();
		const skipLive =
			!forceState &&
			!!this.liveStreams.get(id)?.stream.healthy &&
			cached?.version === warehouse.version;

		const retainedLayout = this.cache.getQueryData<LayoutDto>([
			"warehouses",
			id,
			"published-layout",
		]);
		const cachedLayout =
			retainedLayout?.version === warehouse.version
				? retainedLayout
				: undefined;
		const layoutPromise =
			withMap && warehouse.published
				? cachedLayout
					? Promise.resolve(cachedLayout)
					: this.http
							.request(`${base}/layout`, { signal })
							.then((data) => parseResponse(layoutDto, data))
				: Promise.resolve(null);
		const draftPromise = !withMap
			? Promise.resolve(null)
			: this.http
					.request(`${base}/layout/draft`, { signal })
					.then((data) => parseResponse(layoutDto, data))
					.catch((e) => {
						if (e instanceof ApiError && e.status === 404) {
							return null;
						}
						throw e;
					});
		const [
			layout,
			draft,
			state,
			robots,
			categories,
			products,
			orders,
			stock,
			events,
		] = await Promise.all([
			layoutPromise,
			draftPromise,
			withMap
				? skipLive && cached
					? Promise.resolve({
							warehouse_id: id,
							state_version: cached.stateVersion ?? "0",
							tick: cached.tick,
							layout_version: cached.version,
							as_of: cached.asOf,
							robots: cached.robots.map((robot) => ({
								id: robot.id,
								x: robot.x,
								y: robot.y,
								status: robot.status,
								motion_path: robot.motionPath,
							})),
						})
					: readMapState(this.http, `${base}/map/state`, { signal })
				: Promise.resolve(null),
			withMap || needs("robots")
				? readWarehouseCollection(this.http, `${base}/robots`, robotDto, signal)
				: Promise.resolve([]),
			needs("catalog")
				? readWarehouseCollection(
						this.http,
						`${base}/categories?include_archived=true`,
						categoryDto,
						signal,
					)
				: Promise.resolve([]),
			needs("catalog")
				? readWarehouseCollection(
						this.http,
						`${base}/products?include_archived=true`,
						productDto,
						signal,
					)
				: Promise.resolve([]),
			needs("orders")
				? readWarehouseCollection(this.http, `${base}/orders`, orderDto, signal)
				: Promise.resolve([]),
			needs("inventory")
				? readWarehouseCollection(
						this.http,
						`${base}/inventory?include_robots=true`,
						stockDto,
						signal,
					)
				: Promise.resolve([]),
			needs("history")
				? readWarehouseCollection(this.http, `${base}/events`, eventDto, signal)
				: Promise.resolve([]),
		]);

		this.assertActive(generation, signal);
		if (withMap && (!state || state.warehouse_id !== id)) {
			throw new Error("Получен снимок другого склада");
		}
		if (
			(state && state.layout_version !== warehouse.version) ||
			(layout &&
				(layout.version !== warehouse.version ||
					layout.width !== warehouse.width ||
					layout.height !== warehouse.height))
		) {
			this.cache.removeQueries({
				queryKey: ["warehouses", id, "published-layout"],
			});
			throw new Error("Карта изменилась. Повторите синхронизацию.");
		}
		if (!layout) {
			warehouse.cells = Array.from(
				{ length: warehouse.width * warehouse.height },
				(_, index) => ({
					x: index % warehouse.width,
					y: Math.floor(index / warehouse.width),
					type: "empty",
					capacity: undefined,
				}),
			);
		}
		if (layout) {
			warehouse.cells = cellsFromDto(layout);
			warehouse.routePlans = layout.routes;
		}
		if (draft) {
			warehouse.draft = cellsFromDto(draft);
			warehouse.draftRoutes = draft.routes;
			warehouse.draftRevision = draft.revision;
		}
		warehouse.stateVersion = String(
			state?.state_version ?? warehouse.stateVersion ?? "0",
		);
		warehouse.tick = String(state?.tick ?? warehouse.tick);
		warehouse.asOf = state?.as_of || d.as_of;
		const live = new Map((state?.robots ?? []).map((r) => [r.id, r]));

		warehouse.robots = robots.map((r) => {
			const robot = robotFromDto(r, live.get(r.id));
			return skipLive
				? {
						...robot,
						motionTimed: cached?.robots.find((old) => old.id === r.id)
							?.motionTimed,
					}
				: robot;
		});
		warehouse.categories = categories.map(categoryFromDto);
		warehouse.products = products.map(productFromDto);
		warehouse.orders = orders.map(orderFromDto);
		this.assertActive(generation, signal);
		warehouse.stock = stock.map(stockFromDto);
		warehouse.events = events.map(eventFromDto);
		const latest = this.cache.getQueryData<Warehouse>(warehouseKeys.detail(id));
		if (latest && latest.version > warehouse.version) return latest;
		if (layout)
			this.cache.setQueryData(["warehouses", id, "published-layout"], layout);

		if (
			latest?.version === warehouse.version &&
			(BigInt(latest.stateVersion || "0") >
				BigInt(warehouse.stateVersion || "0") ||
				(!withMap && latest.stateVersion === warehouse.stateVersion))
		) {
			warehouse.stateVersion = latest.stateVersion;
			warehouse.tick = latest.tick;
			warehouse.asOf = latest.asOf;
			const liveRobots = new Map(
				latest.robots.map((robot) => [robot.id, robot]),
			);

			warehouse.robots = warehouse.robots.map((robot) => {
				const live = liveRobots.get(robot.id);

				return live
					? {
							...robot,
							x: live.x,
							y: live.y,
							status: live.status,
							motionPath: live.motionPath,
							motionTimed: live.motionTimed,
						}
					: robot;
			});
		}
		const retained = this.cache.getQueryData<Warehouse>(
			warehouseKeys.detail(id),
		);
		const result =
			resource === "all" || !retained
				? warehouse
				: {
						...retained,
						...Object.fromEntries(
							resourceFields[resource].map((key) => [key, warehouse[key]]),
						),
					};
		this.cache.setQueryData(warehouseKeys.detail(id), result);
		if (withMap && state) this.mapStateReady.set(id, warehouse.version);
		return result;
	}

	private async mutate(
		path: string,
		options: RequestOptions,
		keyed = true,
	): Promise<unknown> {
		const generation = this.generation;
		const signature =
			options.idempotencyKey ??
			JSON.stringify([path, options.method, options.body]);
		let key = this.pendingKeys.get(signature) ?? options.idempotencyKey;

		if (keyed && !key) {
			key = crypto.randomUUID();
			this.pendingKeys.set(signature, key);
		}
		try {
			const result = await this.http.request(path, {
				...options,
				idempotencyKey: keyed ? key : undefined,
			});

			this.assertActive(generation, options.signal);
			this.pendingKeys.delete(signature);

			return result;
		} catch (error) {
			if (
				generation === this.generation &&
				error instanceof ApiError &&
				error.status < 500 &&
				error.status !== 429
			) {
				this.pendingKeys.delete(signature);
			}
			throw error;
		}
	}

	private assertActive(generation: number, signal?: AbortSignal | undefined) {
		signal?.throwIfAborted();
		if (generation !== this.generation) {
			throw new DOMException("Сессия склада завершена", "AbortError");
		}
	}

	async create(
		warehouse: WarehouseInput,
		options?: MutationOptions | undefined,
	) {
		const result = parseResponse(
			createdDto,
			await this.mutate("/warehouses", {
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
				this.mutate(
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
