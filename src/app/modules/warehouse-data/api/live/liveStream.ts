import type { QueryClient } from "@tanstack/react-query";
import type { WarehouseLiveState } from "@/domain/warehouse";
import { ApiError, type StreamHttpClient } from "@/shared/http";
import { readSse, type ServerEvent } from "@/shared/realtime";
import type { WarehouseKeys } from "../../model/queries/queryKeys";
import { type LiveRefresh, liveRefreshes, nextLiveSnapshot } from "./livePatch";
import { statePatchDto } from "./statePatch";

export interface LiveStreamStatus {
	onError(error: unknown): void;
	onHealthy(): void;
}

interface LiveStreamOptions {
	keys: WarehouseKeys;
	id: string;
	timing?: { heartbeatMs: number; fallbackMs: number; retryMs: number[] };
	http: StreamHttpClient;
	cache: QueryClient;
	resync: (signal: AbortSignal) => Promise<WarehouseLiveState>;
	poll: (signal: AbortSignal) => Promise<WarehouseLiveState>;
}

export class WarehouseLiveStream {
	healthy = false;
	private controller = new AbortController();
	private connection: AbortController | undefined;
	private fallback: ReturnType<typeof setInterval> | undefined;
	private polling: AbortController | undefined;
	private layoutVersion = -1;
	private started = false;
	private refreshing = new Map<LiveRefresh, boolean>();
	constructor(
		private readonly options: LiveStreamOptions,
		private readonly status: LiveStreamStatus,
	) {}
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
			await this.options.poll(polling.signal);
		} catch (error) {
			if (!polling.signal.aborted) {
				this.status.onError(error);
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
	private async refresh(resource: LiveRefresh) {
		if (this.refreshing.has(resource)) {
			this.refreshing.set(resource, true);
			return;
		}

		const { cache, id } = this.options;
		const queryKey =
			resource === "order-details"
				? this.options.keys.orders(id)
				: this.options.keys.resource(id, resource);
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
				await this.options.resync(signal);
				signal.throwIfAborted();
				const state = cache.getQueryData<WarehouseLiveState>(
					this.options.keys.live(id),
				);

				if (!state) throw new Error("Склад не загружен");

				this.layoutVersion = state.layoutVersion;
				activity();
				const stream = await http.openStream(
					`/warehouses/${encodeURIComponent(id)}/stream?since_version=${encodeURIComponent(state.stateVersion ?? "0")}`,
					{ signal },
				);
				signal.throwIfAborted();
				this.healthy = true;
				this.stopFallback();
				activity();
				this.status.onHealthy();
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
					this.status.onError(error);
					this.stop();
					break;
				}
				this.status.onError(error);
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

		const { id, cache, keys } = this.options;
		const next = nextLiveSnapshot(
			cache.getQueryData(keys.resource(id, "map")),
			cache.getQueryData<WarehouseLiveState>(keys.live(id)),
			parsed.data,
			{ warehouseId: id, layoutVersion: this.layoutVersion, eventId: event.id },
		);

		if (!next) return;

		signal.throwIfAborted();
		cache.setQueryData(keys.live(id), next);

		for (const refresh of liveRefreshes(parsed.data))
			void this.refresh(refresh);
	}
}
