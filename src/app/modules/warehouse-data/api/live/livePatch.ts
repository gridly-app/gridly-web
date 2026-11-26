import type { Warehouse } from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import { applyRobotPatch } from "./applyRobotPatch";
import type { StatePatch } from "./statePatch";

export type LiveRefresh = WarehouseResource | "order-details";

export interface LivePatchContext {
	warehouseId: string;
	layoutVersion: number;
	eventId: string;
}

export function nextLiveSnapshot(
	current: Warehouse | undefined,
	patch: StatePatch,
	context: LivePatchContext,
): Warehouse | null {
	if (patch.warehouse_id !== context.warehouseId)
		throw new Error("Событие другого склада");

	const isPatchLayoutCurrent =
		patch.layout_version === undefined ||
		patch.layout_version === current?.version;
	const isLayoutCurrent =
		current?.version === context.layoutVersion && isPatchLayoutCurrent;

	if (!current || !isLayoutCurrent) throw new Error("Карта изменилась");
	if (BigInt(patch.tick) < BigInt(current.tick))
		throw new Error("Устаревший тик состояния");

	const version = BigInt(patch.state_version);
	const previous = BigInt(current.stateVersion ?? "0");

	if (version <= previous) return null;

	const isNextVersion = version === previous + 1n;
	const matchesEventId =
		!context.eventId || context.eventId === patch.state_version;

	if (!isNextVersion || !matchesEventId)
		throw new Error("Пропущено событие состояния");

	return applyRobotPatch(current, patch);
}

export function liveRefreshes(patch: StatePatch): LiveRefresh[] {
	const refreshes = new Set<LiveRefresh>();

	if (patch.tasks?.length) {
		refreshes.add("robots");
		refreshes.add("orders");
	}

	if (patch.order_changes?.length) refreshes.add("orders");
	if (patch.stock_changes?.length) refreshes.add("inventory");
	if (refreshes.size) refreshes.add("history");
	if (refreshes.has("orders")) refreshes.add("order-details");

	return [...refreshes];
}
