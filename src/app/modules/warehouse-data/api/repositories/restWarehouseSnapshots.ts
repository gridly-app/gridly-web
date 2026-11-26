import type { QueryClient } from "@tanstack/react-query";
import type {
	RobotMotion,
	Warehouse,
	WarehouseLiveState,
	WarehouseResource,
	WarehouseResourceTypes,
} from "@/domain/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import { categoryDto, productDto } from "../catalog/catalogDto";
import { eventDto } from "../history/historyDto";
import { stockDto } from "../inventory/inventoryDto";
import type { LayoutDto, MapStateDto } from "../layout/layout.dto";
import { readMapState } from "../live/readMapState";
import { orderDto } from "../orders/orderDto";
import { robotDto } from "../robots/robotDto";
import type { WarehouseKeys } from "../../model/queries/queryKeys";
import { warehouseSettingsDto } from "../settings/settings.dto";
import { warehouseDto } from "../warehouses/warehouseDto";
import { readWarehouseCollection } from "./readWarehouseCollection";
import {
	categoryFromDto,
	eventFromDto,
	orderFromDto,
	productFromDto,
	robotFromDto,
	stockFromDto,
	warehouseFromDto,
} from "./restMappers";
import {
	mapFromLayouts,
	readDraftLayout,
	readPublishedLayout,
} from "./warehouseSnapshot";

export class RestWarehouseSnapshots {
	private readonly draftAbsent = new Map<string, number>();
	private readonly reads = new Map<string, AbortController>();

	constructor(
		private readonly http: HttpClient,
		private readonly cache: QueryClient,
		private readonly sessionSignal: () => AbortSignal,
		private readonly getKeys: () => WarehouseKeys,
		private readonly readTimeoutMs: number,
		private readonly onLayoutVersionChanged: (id: string) => void,
	) {}

	isReady(id: string) {
		const keys = this.getKeys();
		const map = this.cache.getQueryData(keys.resource(id, "map"));
		const state = this.cache.getQueryData<WarehouseLiveState>(keys.live(id));

		const metadata = this.cache.getQueryData(keys.resource(id, "metadata"));

		return (
			map !== undefined &&
			map.version === state?.layoutVersion &&
			map.version === metadata?.version
		);
	}

	clear() {
		this.draftAbsent.clear();
		this.reads.clear();
	}

	invalidateLayout(id: string) {
		this.reads.get(id)?.abort();
		this.reads.delete(id);
		this.draftAbsent.delete(id);
		this.cache.removeQueries({
			queryKey: this.getKeys().publishedLayout(id),
			exact: true,
		});
	}

	private readSignal(id: string, callerSignal?: AbortSignal) {
		let controller = this.reads.get(id);

		if (!controller) {
			controller = new AbortController();
			this.reads.set(id, controller);
		}

		return AbortSignal.any([
			this.sessionSignal(),
			controller.signal,
			AbortSignal.timeout(this.readTimeoutMs),
			...(callerSignal ? [callerSignal] : []),
		]);
	}

	async getLive(id: string, callerSignal?: AbortSignal) {
		const keys = this.getKeys();
		const key = keys.live(id);
		const signal = this.readSignal(id, callerSignal);
		const current = this.cache.getQueryData<WarehouseLiveState>(key);

		if (!current || !this.isReady(id))
			throw new Error("Сначала загрузите склад");

		const base = `/warehouses/${encodeURIComponent(id)}`;
		const state = await readMapState(
			this.http,
			`${base}/map/state?after_version=${current.stateVersion ?? "0"}`,
			{ signal },
		);

		signal.throwIfAborted();

		const latest = this.cache.getQueryData<WarehouseLiveState>(key);

		if (
			!latest ||
			!this.isReady(id) ||
			latest.layoutVersion !== current.layoutVersion
		)
			throw new Error("Карта изменилась. Дождитесь повторной синхронизации.");
		if (!state) return latest;

		this.checkState(state, id, latest.layoutVersion);

		if (BigInt(state.state_version) <= BigInt(latest.stateVersion ?? "0"))
			return latest;

		const robots = latest.robots.map(({ id, x, y, status }) => ({
			id,
			x,
			y,
			status,
		}));
		const next = {
			...latest,
			...this.stateFields(state),
			robots: this.mergeMapPositions(robots, state),
		};

		this.cache.setQueryData(key, next);

		return next;
	}

	async resyncLive(id: string, callerSignal?: AbortSignal) {
		const keys = this.getKeys();
		const signal = this.readSignal(id, callerSignal);
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const [map, { robots }, state] = await Promise.all([
			this.read(id, "map", signal),
			this.readers.robots(base, signal, id),
			readMapState(this.http, `${base}/map/state`, { signal }),
		]);

		signal.throwIfAborted();
		this.checkState(state, id, map.version);

		const metadata = this.cache.getQueryData(keys.resource(id, "metadata"));

		if (metadata && metadata.version !== map.version)
			throw new Error("Карта изменилась. Повторите синхронизацию.");

		const key = keys.live(id);
		const latest = this.cache.getQueryData<WarehouseLiveState>(key);
		const positions = this.mergeMapPositions(robots, state);
		const keepLatest =
			latest?.layoutVersion === map.version &&
			BigInt(latest.stateVersion ?? "0") >= BigInt(state.state_version);
		const latestPositions = new Map(
			latest?.robots.map((robot) => [robot.id, robot]),
		);
		const next = keepLatest
			? {
					...latest,
					robots: positions.map(
						(robot) => latestPositions.get(robot.id) ?? robot,
					),
				}
			: {
					layoutVersion: map.version,
					...this.stateFields(state),
					robots: positions,
				};

		this.cache.setQueryData(key, next);

		return next;
	}

	async read<Resource extends WarehouseResource>(
		id: string,
		resource: Resource,
		callerSignal?: AbortSignal,
	): Promise<WarehouseResourceTypes[Resource]> {
		const keys = this.getKeys();
		const signal = this.readSignal(id, callerSignal);
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const data = await this.readers[resource](base, signal, id);

		signal.throwIfAborted();

		const key = keys.resource(id, resource);

		return this.cache.setQueryData(key, data) ?? data;
	}

	private readonly readers: {
		[Resource in WarehouseResource]: (
			base: string,
			signal: AbortSignal,
			id: string,
		) => Promise<WarehouseResourceTypes[Resource]>;
	} = {
		metadata: async (base, signal, id) => {
			const { warehouse } = await this.readMetadata(id, base, signal);

			signal.throwIfAborted();

			return this.acceptMetadata(id, warehouse);
		},
		map: (base, signal, id) => this.readMap(base, signal, id),
		robots: async (base, signal) => {
			const robots = await readWarehouseCollection(
				this.http,
				`${base}/robots`,
				robotDto,
				signal,
			);

			return { robots: robots.map(robotFromDto) };
		},
		catalog: async (base, signal) => {
			const [categories, products] = await Promise.all([
				readWarehouseCollection(
					this.http,
					`${base}/categories?include_archived=true`,
					categoryDto,
					signal,
				),
				readWarehouseCollection(
					this.http,
					`${base}/products?include_archived=true`,
					productDto,
					signal,
				),
			]);

			return {
				categories: categories.map(categoryFromDto),
				products: products.map(productFromDto),
			};
		},
		orders: async (base, signal) => {
			const orders = await readWarehouseCollection(
				this.http,
				`${base}/orders`,
				orderDto,
				signal,
			);

			return { orders: orders.map(orderFromDto) };
		},
		inventory: async (base, signal) => {
			const stock = await readWarehouseCollection(
				this.http,
				`${base}/inventory?include_robots=true`,
				stockDto,
				signal,
			);

			return { stock: stock.map(stockFromDto) };
		},
		history: async (base, signal, id) => {
			const [{ writeOffs }, events] = await Promise.all([
				this.readMetadata(id, base, signal),
				readWarehouseCollection(this.http, `${base}/events`, eventDto, signal),
			]);

			return { events: events.map(eventFromDto), writeOffs };
		},
		settings: async (base, signal, id) => {
			const settings = parseResponse(
				warehouseSettingsDto,
				await this.http.request(`${base}/settings`, { signal }),
			);
			const current = this.cache.getQueryData(
				this.getKeys().resource(id, "settings"),
			);

			return current && current.settings.revision > settings.revision
				? current
				: { settings };
		},
	};

	private async readMetadata(id: string, base: string, signal: AbortSignal) {
		const dto = parseResponse(
			warehouseDto,
			await this.http.request(`${base}?include_summary=true`, { signal }),
		);

		if (dto.id !== id) throw new Error("Получен снимок другого склада");

		return { warehouse: warehouseFromDto(dto), writeOffs: dto.write_offs };
	}

	private acceptMetadata(id: string, warehouse: Warehouse) {
		const keys = this.getKeys();
		const current = this.cache.getQueryData(keys.resource(id, "metadata"));

		if (!current) return warehouse;
		if (current.version > warehouse.version) return current;

		if (current.version < warehouse.version) {
			this.onLayoutVersionChanged(id);

			return warehouse;
		}

		const newerRevision =
			current.revision !== undefined &&
			warehouse.revision !== undefined &&
			current.revision > warehouse.revision;

		return newerRevision ? current : warehouse;
	}

	private async readMap(base: string, signal: AbortSignal, id: string) {
		const keys = this.getKeys();
		const { warehouse } = await this.readMetadata(id, base, signal);
		const key = keys.publishedLayout(id);
		const cached = this.cache.getQueryData<LayoutDto>(key);
		const skipDraft = this.draftAbsent.get(id) === warehouse.version;
		const [layout, draft] = await Promise.all([
			readPublishedLayout(this.http, base, warehouse, cached, signal),
			skipDraft ? undefined : readDraftLayout(this.http, base, signal),
		]);

		signal.throwIfAborted();

		const metadata = this.acceptMetadata(id, warehouse);

		if (
			metadata.version !== warehouse.version ||
			metadata.width !== warehouse.width ||
			metadata.height !== warehouse.height ||
			(layout &&
				(layout.version !== warehouse.version ||
					layout.width !== warehouse.width ||
					layout.height !== warehouse.height))
		) {
			throw new Error("Карта изменилась. Повторите синхронизацию.");
		}

		if (layout) this.cache.setQueryData(key, layout);
		if (draft) this.draftAbsent.delete(id);
		else this.draftAbsent.set(id, warehouse.version);

		this.cache.setQueryData(keys.resource(id, "metadata"), metadata);

		return mapFromLayouts(warehouse, layout, draft);
	}

	private checkState(
		state: MapStateDto | undefined,
		id: string,
		layoutVersion: number,
	): asserts state is MapStateDto {
		if (!state || state.warehouse_id !== id)
			throw new Error("Получен снимок другого склада");
		if (state.layout_version !== layoutVersion)
			throw new Error("Карта изменилась. Повторите синхронизацию.");
	}

	private stateFields(state: MapStateDto) {
		return {
			stateVersion: String(state.state_version),
			tick: String(state.tick),
			asOf: state.as_of,
		};
	}

	private mergeMapPositions(
		robots: RobotMotion[],
		state: MapStateDto,
	): RobotMotion[] {
		const byId = new Map(state.robots.map((robot) => [robot.id, robot]));

		return robots.map(({ id, x, y, status, motionPath }) => {
			const position = byId.get(id);

			return {
				id,
				x: position?.x ?? x,
				y: position?.y ?? y,
				status: position?.status || status,
				motionPath: position?.motion_path ?? motionPath,
				motionTimed: undefined,
			};
		});
	}
}
