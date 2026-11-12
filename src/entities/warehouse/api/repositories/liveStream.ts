import type { QueryClient } from "@tanstack/react-query";
import {
	ApiError,
	type HttpClient,
	readSse,
	type ServerEvent,
} from "@/shared/api";
import { toLiveState } from "../../model/liveState";
import type { Warehouse, WarehouseLiveState } from "../../model/warehouse";
import { statePatchDto } from "../contracts/statePatch";
import { warehouseKeys } from "../queries/queryKeys";
import type { WarehouseResource } from "../queries/resources";
import { applyRobotPatch } from "./applyRobotPatch";

interface LiveStreamOptions {
	id: string;
	timing?: { heartbeatMs: number; fallbackMs: number; retryMs: number[] };
	http: HttpClient;
	cache: QueryClient;
	snapshotReady: () => boolean;
	resync: (signal: AbortSignal) => Promise<Warehouse>;
	poll: (signal: AbortSignal) => Promise<WarehouseLiveState>;
}

export class WarehouseLiveStream {
	healthy = false;
	private controller = new AbortController();
	private connection: AbortController | undefined;
	private fallback: ReturnType<typeof setInterval> | undefined;
	private polling: AbortController | undefined;
	private fallbackHealthy = false;
	private layoutVersion = -1;
	private started = false;
	private refreshing = new Map<WarehouseResource | "order-details", boolean>();
	private onError: (error: unknown) => void;
	constructor(
		private readonly options: LiveStreamOptions,
		onError: (error: unknown) => void,
	) {
		this.onError = onError;
	}
	start() {
		if (!this.started) {
			this.started = true;
			void this.run();
		}
	}
	stop() {
		this.controller.abort();
		this.connection?.abort();
		this.healthy = false;
		this.stopFallback();
	}
	invalidate() {
		this.healthy = false;
		this.connection?.abort();
	}
	private stopFallback() {
		clearInterval(this.fallback);
		this.fallback = undefined;
		this.polling?.abort();
		this.fallbackHealthy = false;
	}
	private startFallback() {
		if (this.fallback || this.controller.signal.aborted) return;
		this.fallback = setInterval(() => {
			void this.poll();
		}, this.options.timing?.fallbackMs ?? 1000);
	}
	private async poll() {
		if (this.polling || this.healthy || this.controller.signal.aborted) return;
		const polling = new AbortController();
		this.polling = polling;
		try {
			const state = await this.options.poll(polling.signal);
			polling.signal.throwIfAborted();
			this.options.cache.setQueryData(
				warehouseKeys.live(this.options.id),
				state,
			);
			this.fallbackHealthy = true;
			this.onError(undefined);
		} catch (error) {
			if (!polling.signal.aborted) {
				this.fallbackHealthy = false;
				this.onError(error);
			}
		} finally {
			this.polling = undefined;
		}
	}
	private async wait(milliseconds: number) {
		const signal = this.controller.signal;
		if (signal.aborted) return;
		await new Promise<void>((resolve) => {
			const finish = () => {
				clearTimeout(timer);
				signal.removeEventListener("abort", finish);
				resolve();
			};
			const timer = setTimeout(finish, milliseconds);
			signal.addEventListener("abort", finish, { once: true });
		});
	}
	private async refresh(resource: WarehouseResource | "order-details") {
		if (this.refreshing.has(resource)) {
			this.refreshing.set(resource, true);
			return;
		}

		const { cache, id } = this.options;
		const queryKey =
			resource === "order-details"
				? warehouseKeys.orders(id)
				: warehouseKeys.resource(id, resource);
		this.refreshing.set(resource, false);
		try {
			do {
				const alreadyFetching = cache.isFetching({ queryKey }) > 0;
				this.refreshing.set(resource, false);
				await cache.invalidateQueries({ queryKey }, { cancelRefetch: false });
				if (!alreadyFetching && !this.refreshing.get(resource)) break;
			} while (!this.controller.signal.aborted);
		} finally {
			this.refreshing.delete(resource);
		}
	}
	private async run() {
		const { http, id, cache } = this.options;
		let failures = 0;
		let first = true;
		while (!this.controller.signal.aborted) {
			const connection = new AbortController();
			this.connection = connection;
			const signal = AbortSignal.any([
				this.controller.signal,
				connection.signal,
			]);
			let watchdog: ReturnType<typeof setTimeout> | undefined;
			const activity = () => {
				clearTimeout(watchdog);
				watchdog = setTimeout(
					() => connection.abort(),
					this.options.timing?.heartbeatMs ?? 45000,
				);
			};
			try {
				this.startFallback();
				if (!first || !this.options.snapshotReady())
					await this.options.resync(signal);
				first = false;
				signal.throwIfAborted();
				const warehouse = cache.getQueryData<Warehouse>(
					warehouseKeys.detail(id),
				);
				if (!warehouse) throw new Error("Склад не загружен");
				this.layoutVersion = warehouse.version;
				cache.setQueryData(warehouseKeys.live(id), toLiveState(warehouse));
				if (!http.openStream) throw new Error("Потоковый транспорт недоступен");
				activity();
				const stream = await http.openStream(
					`/warehouses/${encodeURIComponent(id)}/stream?since_version=${encodeURIComponent(warehouse.stateVersion ?? "0")}`,
					{ signal },
				);
				signal.throwIfAborted();
				this.healthy = true;
				this.stopFallback();
				activity();
				this.onError(undefined);
				await readSse(
					stream,
					async (event) => {
						await this.apply(event, signal);
						failures = 0;
					},
					activity,
					signal,
				);
				throw new Error("Соединение с потоком состояния закрыто");
			} catch (error) {
				if (this.controller.signal.aborted) break;
				if (error instanceof ApiError && error.status === 401) {
					this.onError(error);
					this.stop();
					break;
				}
				if (!this.fallbackHealthy) this.onError(error);
			} finally {
				clearTimeout(watchdog);
				connection.abort();
				this.healthy = false;
			}
			this.startFallback();
			const retries = this.options.timing?.retryMs ?? [
				1000, 2000, 4000, 8000, 16000, 30000,
			];
			await this.wait(
				retries[Math.min(failures++, retries.length - 1)] ?? 30000,
			);
		}
	}
	private async apply(event: ServerEvent, signal: AbortSignal) {
		signal.throwIfAborted();
		if (event.event === "RESYNC_REQUIRED")
			throw new Error("Требуется синхронизация состояния");
		if (event.event !== "STATE_PATCH") return;
		const parsed = statePatchDto.safeParse(JSON.parse(event.data));
		if (!parsed.success) throw new Error("Некорректное событие состояния");
		const patch = parsed.data;
		const { id, cache } = this.options;
		if (patch.warehouse_id !== id) throw new Error("Событие другого склада");
		const current = cache.getQueryData<Warehouse>(warehouseKeys.detail(id));
		if (
			!current ||
			current.version !== this.layoutVersion ||
			(patch.layout_version !== undefined &&
				patch.layout_version !== current.version)
		)
			throw new Error("Карта изменилась");
		if (BigInt(patch.tick) < BigInt(current.tick))
			throw new Error("Устаревший тик состояния");
		const version = BigInt(patch.state_version),
			previous = BigInt(current.stateVersion ?? "0");
		if (version <= previous) return;
		if (
			version !== previous + 1n ||
			(event.id && event.id !== patch.state_version)
		)
			throw new Error("Пропущено событие состояния");
		const next = applyRobotPatch(current, patch);
		signal.throwIfAborted();
		cache.setQueryData(warehouseKeys.detail(id), next);
		cache.setQueryData(warehouseKeys.live(id), toLiveState(next));
		const resources = new Set<WarehouseResource>();
		if (patch.tasks?.length) {
			resources.add("robots");
			resources.add("orders");
		}
		if (patch.order_changes?.length) resources.add("orders");
		if (patch.stock_changes?.length) resources.add("inventory");
		if (resources.size) resources.add("history");
		for (const resource of resources) void this.refresh(resource);
		if (resources.has("orders")) void this.refresh("order-details");
	}
}
