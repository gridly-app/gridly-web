import { useRef, useState } from "react";
import type { BlockRoutePlan, GridPosition } from "@/entities/warehouse";
import { type Cell, cellKey } from "@/entities/warehouse";
import { errorMessage, UserError } from "@/shared/lib";
import { moveRouteCell } from "../../lib/editRoute";

export interface RouteDragOptions {
	allowStorage?: boolean;
	cells: Cell[];
	block: Cell[];
	direction: "inbound" | "outbound";
	routes: Pick<BlockRoutePlan, "inbound" | "outbound">;
	id: string;
	keys: string[];
	onCommit: (plan: BlockRoutePlan) => void;
	onError: (error: string) => void;
}

export interface RouteDragGesture {
	base: BlockRoutePlan;
	index: number;
	direction: "inbound" | "outbound";
	candidate: BlockRoutePlan | null;
	head: GridPosition;
	moved: boolean;
}

export interface RouteDragHandle {
	point: GridPosition;
	index: number;
}

export function useRouteDrag({
	cells,
	allowStorage = false,
	block,
	direction,
	routes,
	id,
	keys,
	onCommit,
	onError,
}: RouteDragOptions) {
	const gesture = useRef<RouteDragGesture | null>(null);
	const [dragHandle, setDragHandle] = useState<RouteDragHandle | null>(null);
	const [preview, setPreview] = useState<BlockRoutePlan | null>(null);
	function beginDrag(cell: Cell) {
		const index = routes[direction].findIndex(
			(point) => cellKey(point) === cellKey(cell),
		);

		if (!block.length || index < 0) {
			return false;
		}
		gesture.current = {
			base: { id, keys, inbound: routes.inbound, outbound: routes.outbound },
			index,
			direction,
			candidate: null,
			head: cell,
			moved: false,
		};
		setDragHandle({ point: cell, index });
		onError("");

		return true;
	}

	function extendDrag(cell: Cell) {
		const current = gesture.current;

		if (!current || cellKey(current.head) === cellKey(cell)) {
			return;
		}
		current.head = { x: cell.x, y: cell.y };
		current.moved = true;
		setDragHandle({ point: current.head, index: current.index });
		try {
			const path = moveRouteCell(
				cells,
				current.base[current.direction],
				current.index,
				current.head,
				allowStorage,
				new Set(block.map(cellKey)),
			);

			current.candidate = { ...current.base, [current.direction]: path };
			setPreview(current.candidate);
			onError("");
		} catch (error) {
			current.candidate = null;
			setPreview(null);
			onError(errorMessage(error));
		}
	}

	function finishDrag() {
		const current = gesture.current;

		gesture.current = null;
		setPreview(null);
		setDragHandle(null);
		if (!current) {
			return false;
		}
		if (!current.moved || !current.candidate) {
			return true;
		}
		try {
			const path = current.base[current.direction];
			const endpoint = current.index === 0 || current.index === path.length - 1;
			const next = current.candidate;

			if (endpoint) {
				const cell = cells.find(
					(cell) => cellKey(cell) === cellKey(current.head),
				);
				const dockEnd =
					(current.direction === "inbound") === (current.index === 0);
				const validEnd = dockEnd
					? cell?.type === (current.direction === "inbound" ? "unload" : "load")
					: block.some(
							(shelf) =>
								Math.abs(shelf.x - current.head.x) +
									Math.abs(shelf.y - current.head.y) ===
								1,
						);

				if (!validEnd) {
					throw new UserError(
						dockEnd
							? "Конец пути должен находиться на доке. Для изменения прохода перетащите клетку маршрута."
							: "Конец пути должен находиться в проходе рядом с выбранным блоком.",
					);
				}
			}
			onCommit({ ...next, inboundVia: [], outboundVia: [] });
		} catch (error) {
			onError(errorMessage(error));
		}

		return true;
	}

	function cancelDrag() {
		gesture.current = null;
		setPreview(null);
		setDragHandle(null);
	}

	return { preview, dragHandle, beginDrag, extendDrag, finishDrag, cancelDrag };
}
