import type { QueryClient } from "@tanstack/react-query";
import type { Warehouse } from "@/domain/warehouse";
import { mergeRobotPositions, toLiveState } from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import type { LayoutDto } from "../layout/layout.dto";
import { readMapState } from "../live/readMapState";
import type { WarehouseLiveSubscriptions } from "../live/warehouseLiveSubscriptions";
import type { WarehouseKeys } from "../queries/queryKeys";
import { warehouseResourceData } from "../queries/resources";
import { warehouseSettingsDto } from "../settings/settings.dto";
import { warehouseDto } from "../warehouses/warehouseDto";
import { warehouseFromDto } from "./restMappers";
import { assembleSnapshot, readSnapshotParts } from "./warehouseSnapshot";

export class RestWarehouseSnapshots {
	private readonly mapStateReady = new Map<string, number>();
	private readonly reads = new Map<string, AbortController>();

	constructor(
		private readonly http: HttpClient,
		private readonly cache: QueryClient,
		private readonly sessionSignal: () => AbortSignal,
		private readonly getKeys: () => WarehouseKeys,
		private readonly readTimeoutMs: number,
	) {}

	isReady(id: string) {
		const warehouse = this.cache.getQueryData<Warehouse>(
			this.getKeys().detail(id),
		);
		return !!warehouse && this.mapStateReady.get(id) === warehouse.version;
	}

	forgetMapState(id: string) {
		this.mapStateReady.delete(id);
	}

	clear() {
		this.mapStateReady.clear();
		this.reads.clear();
	}

	invalidateLayout(id: string) {
		this.reads.get(id)?.abort();
		this.reads.delete(id);
		this.mapStateReady.delete(id);
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
		const signal = this.readSignal(id, callerSignal);
		const warehouse = this.cache.getQueryData<Warehouse>(
			this.getKeys().detail(id),
		);

		if (!warehouse || this.mapStateReady.get(id) !== warehouse.version) {
			throw new Error("Сначала загрузите склад");
		}
		const state = await readMapState(
			this.http,
			`/warehouses/${encodeURIComponent(id)}/map/state?after_version=${warehouse.stateVersion || "0"}`,
			{ signal },
		);

		signal.throwIfAborted();
		const latest =
			this.cache.getQueryData<Warehouse>(this.getKeys().detail(id)) ??
			warehouse;

		if (this.mapStateReady.get(id) !== latest.version) {
			throw new Error("Карта изменилась. Дождитесь повторной синхронизации.");
		}
		if (!state) return toLiveState(latest);
		if (state.warehouse_id !== id) {
			throw new Error("Получен снимок другого склада");
		}
		if (state.layout_version !== latest.version) {
			throw new Error("Карта изменилась. Дождитесь повторной синхронизации.");
		}
		if (BigInt(state.state_version) <= BigInt(latest.stateVersion || "0")) {
			return toLiveState(latest);
		}

		const positions = new Map(state.robots.map((robot) => [robot.id, robot]));
		const snapshot = {
			...latest,
			stateVersion: String(state.state_version),
			tick: String(state.tick),
			asOf: state.as_of,
			robots: latest.robots.map((robot) => {
				const position = positions.get(robot.id);
				return {
					...robot,
					x: position?.x ?? robot.x,
					y: position?.y ?? robot.y,
					status: position?.status || robot.status,
					motionPath: position?.motion_path,
					motionTimed: undefined,
				};
			}),
		};

		this.cache.setQueryData(this.getKeys().detail(id), snapshot);
		return toLiveState(snapshot);
	}

	async readWarehouse(
		id: string,
		callerSignal: AbortSignal | undefined,
		resource: WarehouseResource,
		live?: Pick<WarehouseLiveSubscriptions, "invalidate" | "isHealthy">,
	): Promise<Warehouse> {
		const signal = this.readSignal(id, callerSignal);
		if (resource === "settings") return this.readSettings(id, signal);
		const withMap = resource === "all" || resource === "map";
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const d = parseResponse(
			warehouseDto,
			await this.http.request(base, { signal }),
		);

		signal.throwIfAborted();
		const warehouse = warehouseFromDto(d);
		const cached = this.cache.getQueryData<Warehouse>(
			this.getKeys().detail(id),
		);
		if (cached && cached.version < warehouse.version) live?.invalidate(id);
		const skipLive =
			live?.isHealthy(id) === true && cached?.version === warehouse.version;

		const retainedLayout = this.cache.getQueryData<LayoutDto>(
			this.getKeys().publishedLayout(id),
		);
		const cachedLayout =
			retainedLayout?.version === warehouse.version
				? retainedLayout
				: undefined;
		const parts = await readSnapshotParts(
			this.http,
			base,
			warehouse,
			resource,
			skipLive,
			cachedLayout,
			signal,
		);
		const { layout, state } = parts;
		signal.throwIfAborted();
		if (withMap && !skipLive && (!state || state.warehouse_id !== id)) {
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
				queryKey: this.getKeys().publishedLayout(id),
			});
			throw new Error("Карта изменилась. Повторите синхронизацию.");
		}
		assembleSnapshot(warehouse, parts);
		const latest = this.cache.getQueryData<Warehouse>(
			this.getKeys().detail(id),
		);
		if (latest && latest.version > warehouse.version) return latest;
		if (layout)
			this.cache.setQueryData(this.getKeys().publishedLayout(id), layout);

		const latestStateVersion = BigInt(latest?.stateVersion || "0");
		const stateVersion = BigInt(warehouse.stateVersion || "0");
		if (
			latest?.version === warehouse.version &&
			(skipLive ||
				latestStateVersion > stateVersion ||
				(latestStateVersion === stateVersion &&
					(!withMap || this.mapStateReady.get(id) === warehouse.version)))
		) {
			warehouse.stateVersion = latest.stateVersion;
			warehouse.tick = latest.tick;
			warehouse.asOf = latest.asOf;
			warehouse.robots = mergeRobotPositions(warehouse.robots, latest.robots);
		}
		const result =
			resource === "all" || !latest
				? warehouse
				: { ...latest, ...warehouseResourceData(resource, warehouse) };
		this.cache.setQueryData(this.getKeys().detail(id), result);
		if (withMap && state) this.mapStateReady.set(id, warehouse.version);
		return result;
	}

	private async readSettings(id: string, signal: AbortSignal) {
		const settings = parseResponse(
			warehouseSettingsDto,
			await this.http.request(
				`/warehouses/${encodeURIComponent(id)}/settings`,
				{ signal },
			),
		);
		signal.throwIfAborted();
		const warehouse = this.cache.getQueryData<Warehouse>(
			this.getKeys().detail(id),
		);
		if (!warehouse) throw new Error("Сначала загрузите склад");
		const result = {
			...warehouse,
			settings:
				!warehouse.settings || settings.revision >= warehouse.settings.revision
					? settings
					: warehouse.settings,
		};
		this.cache.setQueryData(this.getKeys().detail(id), result);
		return result;
	}
}
