import type { KeyboardEvent, PointerEvent } from "react";
import type { Cell, GridPosition, WarehouseView } from "@/domain/warehouse";
import { cellKey, storageCellTypes } from "@/domain/warehouse";
import type { MapEditor } from "../draft/useMapEditor";
import type { useRouteEditor } from "../editor/useRouteEditor";
import type { useMapCamera } from "./useMapCamera";
import type { useMapRenderer } from "./useMapRenderer";

export interface MapInteractionOptions {
	warehouse: Pick<WarehouseView<"robots">, "width" | "height" | "robots">;
	editor: Pick<MapEditor, "selection" | "closeEditor" | "busy">;
	cellIndex: ReadonlyMap<string, Cell>;
	routeEditor: Pick<ReturnType<typeof useRouteEditor>, "select" | "drag">;
	editing: boolean;
	configuringRoutes: boolean;
	camera: Pick<ReturnType<typeof useMapCamera>, "pan" | "size">;
	rendering: Pick<ReturnType<typeof useMapRenderer>, "renderer">;
	selectRobot: (id: string | null) => void;
}

export function createMapHandlers({
	warehouse,
	editor,
	cellIndex,
	routeEditor,
	editing,
	configuringRoutes,
	camera: { pan, size },
	rendering: { renderer },
	selectRobot,
}: MapInteractionOptions) {
	const { selection } = editor;
	const { selected } = selection;

	type PointerHit = GridPosition & { canvasX: number; canvasY: number };

	function cellAt(point: GridPosition | undefined) {
		return point && cellIndex.get(cellKey(point));
	}

	interface PointerInteraction {
		down(event: PointerEvent<HTMLElement>, cell: Cell | undefined): void;
		move(event: PointerEvent<HTMLElement>, cell: Cell | undefined): void;
		up(point: PointerHit | undefined): void;
	}

	const routeInteraction: PointerInteraction = {
		down(event, cell) {
			if (cell && routeEditor.drag.beginDrag(cell))
				event.currentTarget.setPointerCapture(event.pointerId);
		},
		move(_event, cell) {
			if (cell) routeEditor.drag.extendDrag(cell);
		},
		up(point) {
			if (routeEditor.drag.finishDrag()) return;

			const cell = cellAt(point);

			if (!cell) return;

			routeEditor.select(cell);

			if (storageCellTypes.includes(cell.type)) selection.setSelected(cell);
		},
	};

	const editInteraction: PointerInteraction = {
		down(event, cell) {
			if (!cell) return;

			selection.beginSelection(cell);
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		move(_event, cell) {
			if (cell) selection.extendSelection(cell);
		},
		up(point) {
			selectRobot(null);
			selection.finishSelection(cellAt(point));
		},
	};

	const viewInteraction: PointerInteraction = {
		down(event) {
			pan.start(event);
		},
		move(event) {
			pan.move(event);
		},
		up(point) {
			if (pan.finish()) return;

			const cell = cellAt(point);

			if (!cell || !point) return;

			const robotId =
				renderer.current?.findRobotAt(point.canvasX, point.canvasY, size) ||
				warehouse.robots.find(
					(robot) => robot.x === cell.x && robot.y === cell.y,
				)?.id;

			selectRobot(robotId || null);
			selection.setSelected(robotId ? null : cell);
		},
	};

	function currentInteraction() {
		if (configuringRoutes) return routeInteraction;
		if (editing) return editInteraction;

		return viewInteraction;
	}

	function handlePointerDown(
		event: PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy || event.button !== 0) return;

		currentInteraction().down(event, cellAt(point));
	}

	function handlePointerMove(
		event: PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy) return;

		currentInteraction().move(event, cellAt(point));
	}

	function handlePointerUp(
		_event: PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy) return;

		currentInteraction().up(point);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
		if (editor.busy) return;
		if (event.key === "Escape") {
			editor.closeEditor();
		}
		if (event.key === "Enter" && selected) {
			selection.toggleCell(selected);
		}
		const directions: Partial<Record<string, readonly [number, number]>> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const direction = directions[event.key];
		if (direction) {
			selectRobot(null);
			event.preventDefault();
			const [dx, dy] = direction;
			const x = Math.max(
				0,
				Math.min(warehouse.width - 1, (selected?.x ?? 0) + dx),
			);
			const y = Math.max(
				0,
				Math.min(warehouse.height - 1, (selected?.y ?? 0) + dy),
			);
			selection.setSelected(cellIndex.get(cellKey({ x, y })) ?? null);
		}
	}

	function handlePointerCancel() {
		pan.finish();
		routeEditor.drag.cancelDrag();
		selection.cancelSelection();
	}

	return {
		onKeyDown: handleKeyDown,
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onPointerCancel: handlePointerCancel,
	};
}
