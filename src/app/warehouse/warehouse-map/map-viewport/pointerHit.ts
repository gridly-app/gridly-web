import type { GridPosition } from "@/domain/warehouse/layout";

export interface PointerHit extends GridPosition {
	canvasX: number;
	canvasY: number;
}

export function pointerHit(
	pointer: { clientX: number; clientY: number },
	bounds: { left: number; top: number },
	size: number,
	gridInset: number,
): PointerHit {
	const canvasX = pointer.clientX - bounds.left;
	const canvasY = pointer.clientY - bounds.top;

	return {
		canvasX,
		canvasY,
		x: Math.floor((canvasX - gridInset) / size),
		y: Math.floor((canvasY - gridInset) / size),
	};
}
