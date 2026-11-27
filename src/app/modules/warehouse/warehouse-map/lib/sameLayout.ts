import type { GridPosition } from "@/domain/warehouse";

import type { LayoutRenderState } from "./canvas/CanvasWarehouseRenderer";

type MaybePoint = GridPosition | null | undefined;

function samePoint(a: MaybePoint, b: MaybePoint) {
	return a === b || (a?.x === b?.x && a?.y === b?.y);
}

function samePath(a: GridPosition[] = [], b: GridPosition[] = []) {
	return (
		a === b ||
		(a.length === b.length &&
			a.every((point, index) => samePoint(point, b[index])))
	);
}

function sameKeys(a: string[], b: string[]) {
	return a.length === b.length && a.every((key, index) => key === b[index]);
}

export function sameLayout(a: LayoutRenderState, b: LayoutRenderState) {
	return (
		a.cells === b.cells &&
		a.warehouse.width === b.warehouse.width &&
		a.warehouse.height === b.warehouse.height &&
		a.size === b.size &&
		a.dark === b.dark &&
		samePoint(a.selected, b.selected) &&
		sameKeys(a.selectionKeys, b.selectionKeys) &&
		samePath(a.routes?.inbound, b.routes?.inbound) &&
		samePath(a.routes?.outbound, b.routes?.outbound) &&
		a.routeHandles === b.routeHandles &&
		a.routeDragHandle?.index === b.routeDragHandle?.index &&
		samePoint(a.routeDragHandle?.point, b.routeDragHandle?.point)
	);
}
