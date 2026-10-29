import type { GridPosition } from "@/entities/warehouse";
import type { LayoutRenderState } from "./CanvasWarehouseRenderer";

const samePoint = (
	a?: (GridPosition | null) | undefined,
	b?: (GridPosition | null) | undefined,
) => a === b || (a?.x === b?.x && a?.y === b?.y);

function samePath(a: GridPosition[] = [], b: GridPosition[] = []) {
	return (
		a === b ||
		(a.length === b.length &&
			a.every((point, index) => samePoint(point, b[index])))
	);
}

export function sameLayout(a: LayoutRenderState, b: LayoutRenderState) {
	return (
		a.cells === b.cells &&
		a.w.width === b.w.width &&
		a.w.height === b.w.height &&
		a.size === b.size &&
		a.dark === b.dark &&
		samePoint(a.selected, b.selected) &&
		a.selectionKeys.length === b.selectionKeys.length &&
		a.selectionKeys.every((key, index) => key === b.selectionKeys[index]) &&
		samePath(a.routes?.inbound, b.routes?.inbound) &&
		samePath(a.routes?.outbound, b.routes?.outbound) &&
		a.routeHandles === b.routeHandles &&
		a.routeDragHandle?.index === b.routeDragHandle?.index &&
		samePoint(a.routeDragHandle?.point, b.routeDragHandle?.point)
	);
}
