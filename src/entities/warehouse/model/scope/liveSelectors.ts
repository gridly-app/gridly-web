import { mergeLiveState } from "../../api/repositories/mergeLiveState";
import type { Warehouse, WarehouseLiveState } from "../warehouse/schemas";

export const selectMapLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => {
	const warehouse = mergeLiveState(snapshot, live);
	return {
		summary: warehouse.summary,
		robots: warehouse.robots,
		asOf: warehouse.asOf,
		tick: warehouse.tick,
		stateVersion: warehouse.stateVersion,
		running: warehouse.running,
		stock: warehouse.stock,
		orders: warehouse.orders,
		events: warehouse.events,
	};
};

export const selectRobotsLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => ({ robots: mergeLiveState(snapshot, live).robots });

export const selectInventoryLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => ({ stock: live?.stock ?? snapshot.stock });

export const selectOrdersLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => ({
	summary: live?.summary ?? snapshot.summary,
	orders: live?.orders ?? snapshot.orders,
	stock: live?.stock ?? snapshot.stock,
});

export const selectHistoryLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => ({ events: live?.events ?? snapshot.events });
