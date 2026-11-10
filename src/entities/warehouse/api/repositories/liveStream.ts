import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type HttpClient } from "@/shared/api";
import { readSse, type ServerEvent } from "@/shared/api/readSse";
import type {
	Warehouse,
	WarehouseLiveState,
} from "../../model/warehouse/schemas";
import { statePatchDto } from "../contracts/statePatch";
import { warehouseKeys } from "../queries/queryKeys";

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
	private polling = false;
	private layoutVersion = -1;
	private started = false;
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
	}
	private startFallback() {
		if (this.fallback || this.controller.signal.aborted) return;
		this.fallback = setInterval(() => {
			void this.poll();
		}, this.options.timing?.fallbackMs ?? 1000);
	}
	private async poll() {
		if (this.polling || this.healthy || this.controller.signal.aborted) return;
		this.polling = true;
		try {
			const state = await this.options.poll(this.controller.signal);
			if (!this.controller.signal.aborted)
				this.options.cache.setQueryData(
					warehouseKeys.live(this.options.id),
					state,
				);
		} catch (error) {
			if (!this.controller.signal.aborted) this.onError(error);
		} finally {
			this.polling = false;
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
				if (!first || !this.options.snapshotReady())
					await this.options.resync(signal);
				first = false;
				signal.throwIfAborted();
				const warehouse = cache.getQueryData<Warehouse>(
					warehouseKeys.detail(id),
				);
				if (!warehouse) throw new Error("Склад не загружен");
				this.layoutVersion = warehouse.version;
				cache.setQueryData(warehouseKeys.live(id), {
					...warehouse,
					layoutVersion: warehouse.version,
				});
				if (!http.openStream) throw new Error("Потоковый транспорт недоступен");
				this.startFallback();
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
				this.onError(error);
				if (
					error instanceof ApiError &&
					(error.status === 401 || error.status === 403)
				) {
					this.stop();
					break;
				}
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
		const known = new Set(current.robots.map((r) => r.id));
		if (patch.robots?.some((r) => !known.has(r.robot_id)))
			throw new Error("Требуется загрузить новых роботов");
		const robots = new Map((patch.robots ?? []).map((r) => [r.robot_id, r]));
		if (robots.size !== (patch.robots?.length ?? 0))
			throw new Error("Повторный робот в событии");
		const inBounds = (point: { x: number; y: number }) =>
			point.x < current.width && point.y < current.height;
		const next = {
			...current,
			stateVersion: patch.state_version,
			tick: patch.tick,
			asOf: patch.committed_at,
			robots: current.robots.map((robot) => {
				const update = robots.get(robot.id);
				if (!update)
					return { ...robot, motionPath: undefined, motionTimed: undefined };
				const steps = update.microsteps;
				if (
					![
						update.from,
						update.to,
						...(steps?.flatMap((step) => [step.from, step.to]) ?? []),
					].every(inBounds)
				)
					throw new Error("Траектория выходит за пределы карты");
				let path = [update.from, update.to];
				if (steps?.length) {
					const ordered = [...steps].sort((a, b) => a.slot - b.slot);
					// Server slots may be numbered 0..4 or 1..5. Retain idle slots.
					const origin = ordered.some((step) => step.slot === 0) ? 0 : 1;
					if (
						new Set(ordered.map((step) => step.slot)).size !== ordered.length ||
						ordered.some((step) => step.slot >= origin + 5)
					)
						throw new Error("Некорректные слоты движения");
					path = [update.from];
					for (let slot = origin; slot < origin + 5; slot++) {
						const step = ordered.find((item) => item.slot === slot);
						const previous = path[path.length - 1] ?? update.from;
						if (
							step &&
							(step.from.x !== previous.x || step.from.y !== previous.y)
						)
							throw new Error("Разрыв траектории движения");
						path.push(step?.to ?? previous);
					}
					const last = path.at(-1);
					if (last?.x !== update.to.x || last?.y !== update.to.y)
						throw new Error("Некорректная траектория");
				}
				return {
					...robot,
					x: update.to.x,
					y: update.to.y,
					status: update.status,
					motionPath: path,
					motionTimed: !!steps?.length,
				};
			}),
		};
		signal.throwIfAborted();
		cache.setQueryData(warehouseKeys.detail(id), next);
		cache.setQueryData(warehouseKeys.live(id), {
			...next,
			layoutVersion: next.version,
		});
		const resources = new Set<string>();
		if (patch.tasks?.length) {
			resources.add("robots");
			resources.add("orders");
		}
		if (patch.order_changes?.length) resources.add("orders");
		if (patch.stock_changes?.length) resources.add("inventory");
		if (resources.size) resources.add("history");
		for (const resource of resources)
			void cache.invalidateQueries({
				queryKey: warehouseKeys.resource(id, resource),
			});
		if (resources.has("orders"))
			void cache.invalidateQueries({ queryKey: warehouseKeys.orders(id) });
	}
}
