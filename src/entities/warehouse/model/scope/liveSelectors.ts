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

const operationalLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => {
	const warehouse = mergeLiveState(snapshot, live);
	return {
		robots: warehouse.robots,
		orders: warehouse.orders,
		stock: warehouse.stock,
		summary: warehouse.summary,
		tick: warehouse.tick,
		asOf: warehouse.asOf,
		running: warehouse.running,
	};
};
export const selectRobotsLive = operationalLive;
export const selectInventoryLive = operationalLive;
export const selectOrdersLive = operationalLive;

export const selectHistoryLive = (
	snapshot: Warehouse,
	live?: WarehouseLiveState | undefined,
) => ({ events: live?.events ?? snapshot.events });
