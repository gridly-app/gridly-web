import { useRef, useState } from "react";

import {
	type BlockRoutePlan,
	type Cell,
	cellKey,
	type GridPosition,
} from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";

import { moveRouteCell } from "../../lib/editRoute";

type RouteDirection = "inbound" | "outbound";

interface RouteDragOptions {
	allowStorage?: boolean;
	cells: Cell[];
	block: Cell[];
	direction: RouteDirection;
	routes: Pick<BlockRoutePlan, "inbound" | "outbound">;
	id: string | undefined;
	keys: string[];
	onCommit: (plan: BlockRoutePlan) => void;
	onError: (error: string) => void;
}

interface RouteDragGesture {
	base: BlockRoutePlan;
	index: number;
	direction: RouteDirection;
	candidate: BlockRoutePlan | null;
	head: GridPosition;
	moved: boolean;
}

export interface RouteDragHandle {
	point: GridPosition;
	index: number;
}

function isAdjacent(cell: GridPosition, point: GridPosition) {
	return Math.abs(cell.x - point.x) + Math.abs(cell.y - point.y) === 1;
}

function endpointError(
	gesture: RouteDragGesture,
	cells: Cell[],
	block: Cell[],
) {
	const path = gesture.base[gesture.direction];
	const isEndpoint = gesture.index === 0 || gesture.index === path.length - 1;

	if (!isEndpoint) return null;

	const isInbound = gesture.direction === "inbound";
	const isDockEnd = isInbound === (gesture.index === 0);

	if (isDockEnd) {
		const cell = cells.find((item) => cellKey(item) === cellKey(gesture.head));
		const dockType = isInbound ? "unload" : "load";

		if (cell?.type === dockType) return null;

		return "Конец пути должен находиться на доке. Для изменения прохода перетащите клетку маршрута.";
	}

	if (block.some((shelf) => isAdjacent(shelf, gesture.head))) return null;

	return "Конец пути должен находиться в проходе рядом с выбранным блоком.";
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

		if (id === undefined || index < 0) return false;

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

		if (!current || cellKey(current.head) === cellKey(cell)) return;

		current.head = { x: cell.x, y: cell.y };
		current.moved = true;
		setDragHandle({ point: current.head, index: current.index });

		try {
			const blocked = new Set(block.map(cellKey));
			const path = moveRouteCell(
				cells,
				current.base[current.direction],
				current.index,
				current.head,
				allowStorage,
				blocked,
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

	function cancelDrag() {
		gesture.current = null;
		setPreview(null);
		setDragHandle(null);
	}

	function finishDrag() {
		const current = gesture.current;

		cancelDrag();

		if (!current) return false;
		if (!current.moved || !current.candidate) return true;

		const error = endpointError(current, cells, block);

		if (error) {
			onError(error);

			return true;
		}

		onCommit({ ...current.candidate, inboundVia: [], outboundVia: [] });

		return true;
	}

	return { preview, dragHandle, beginDrag, extendDrag, finishDrag, cancelDrag };
}
