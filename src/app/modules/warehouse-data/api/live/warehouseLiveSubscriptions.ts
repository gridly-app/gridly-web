import type { QueryClient } from "@tanstack/react-query";
import type { Warehouse, WarehouseLiveState } from "@/domain/warehouse";
import type { StreamHttpClient } from "@/shared/http";
import type { WarehouseKeys } from "../../model/queries/queryKeys";
import { WarehouseLiveStream } from "./liveStream";

interface LiveSnapshots {
	snapshotReady(id: string): boolean;
	resync(id: string, signal: AbortSignal): Promise<Warehouse>;
	poll(id: string, signal: AbortSignal): Promise<WarehouseLiveState>;
	onIdle(id: string): void;
}

export class WarehouseLiveSubscriptions {
	private readonly entries = new Map<
		string,
		{ stream: WarehouseLiveStream; subscribers: number }
	>();

	constructor(
		private readonly http: StreamHttpClient,
		private readonly cache: QueryClient,
		private readonly getKeys: () => WarehouseKeys,
		private readonly snapshots: LiveSnapshots,
	) {}

	subscribe(id: string) {
		let entry = this.entries.get(id);
		if (!entry) {
			entry = { stream: this.createStream(id), subscribers: 0 };
			this.entries.set(id, entry);
		}
		entry.subscribers++;
		entry.stream.start();
		let released = false;
		return () => {
			if (released) return;
			released = true;
			if (--entry.subscribers !== 0) return;

			entry.stream.stop();
			if (this.entries.get(id) !== entry) return;

			this.entries.delete(id);
			this.snapshots.onIdle(id);
			this.cache.setQueryData(this.getKeys().connection(id), false);
		};
	}

	private createStream(id: string) {
		const warehouseKeys = this.getKeys();

		return new WarehouseLiveStream(
			{
				id,
				keys: warehouseKeys,
				http: this.http,
				cache: this.cache,
				snapshotReady: () => this.snapshots.snapshotReady(id),
				resync: async (signal) => {
					const snapshot = await this.snapshots.resync(id, signal);
					signal.throwIfAborted();
					this.cache.setQueryData(warehouseKeys.resource(id, "map"), snapshot);
					void this.cache.invalidateQueries({
						queryKey: warehouseKeys.resource(id, "robots"),
					});
					return snapshot;
				},
				poll: (signal) => this.snapshots.poll(id, signal),
			},
			{
				onError: () => {
					this.cache.setQueryData(warehouseKeys.connection(id), true);
				},
				onHealthy: () => {
					this.cache.setQueryData(warehouseKeys.connection(id), false);
				},
			},
		);
	}

	isHealthy(id: string) {
		return this.entries.get(id)?.stream.healthy === true;
	}

	invalidate(id: string) {
		this.entries.get(id)?.stream.invalidate();
	}

	clear() {
		for (const { stream } of this.entries.values()) stream.stop();
		this.entries.clear();
	}
}
