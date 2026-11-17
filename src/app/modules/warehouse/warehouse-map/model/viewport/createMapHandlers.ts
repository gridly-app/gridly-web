import type { Cell, GridPosition, Warehouse } from "@/domain/warehouse";
import { storageCellTypes } from "@/domain/warehouse";
import type { MapEditor } from "../../draft/useMapEditor";
import type { useRouteEditor } from "../editor/useRouteEditor";
import type { useMapCamera } from "./useMapCamera";
import type { useMapRenderer } from "./useMapRenderer";

export interface MapInteractionOptions {
	warehouse: Pick<Warehouse, "width" | "height" | "robots">;
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
		return point && cellIndex.get(`${point.x},${point.y}`);
	}

	function handlePointerUp(
		_event: React.PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy) return;
		if (configuringRoutes) {
			if (routeEditor.drag.finishDrag()) {
				return;
			}
			const cell = cellAt(point);

			if (cell) {
				routeEditor.select(cell);
				if (storageCellTypes.includes(cell.type)) {
					selection.setSelected(cell);
				}
			}
		} else if (editing) {
			selectRobot(null);
			selection.finishSelection(cellAt(point));
		} else if (!pan.finish()) {
			const cell = cellAt(point);

			if (cell && point) {
				const robotId =
					renderer.current?.findRobotAt(point.canvasX, point.canvasY, size) ||
					warehouse.robots.find(
						(robot) => robot.x === cell.x && robot.y === cell.y,
					)?.id;

				selectRobot(robotId || null);
				selection.setSelected(robotId ? null : cell);
			}
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
		if (editor.busy) return;
		if (e.key === "Escape") {
			editor.closeEditor();
		}
		if (e.key === "Enter" && selected) {
			selection.toggleCell(selected);
		}
		const directions: Partial<Record<string, readonly [number, number]>> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const direction = directions[e.key];
		if (direction) {
			selectRobot(null);
			e.preventDefault();
			const [dx, dy] = direction;
			const x = Math.max(
				0,
				Math.min(warehouse.width - 1, (selected?.x ?? 0) + dx),
			);
			const y = Math.max(
				0,
				Math.min(warehouse.height - 1, (selected?.y ?? 0) + dy),
			);
			selection.setSelected(cellIndex.get(`${x},${y}`) ?? null);
		}
	}

	function handlePointerDown(
		e: React.PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy) return;
		if (e.button !== 0) {
			return;
		}
		if (!editing) {
			pan.start(e);

			return;
		}
		if (configuringRoutes) {
			const cell = cellAt(point);

			if (cell && routeEditor.drag.beginDrag(cell)) {
				e.currentTarget.setPointerCapture(e.pointerId);
			}

			return;
		}
		const cell = cellAt(point);

		if (cell) {
			selection.beginSelection(cell);
			e.currentTarget.setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(
		e: React.PointerEvent<HTMLElement>,
		point?: PointerHit,
	) {
		if (editor.busy) return;
		if (!editing) {
			pan.move(e);

			return;
		}
		if (configuringRoutes) {
			const cell = cellAt(point);

			if (cell) {
				routeEditor.drag.extendDrag(cell);
			}

			return;
		}
		const cell = cellAt(point);

		if (cell) {
			selection.extendSelection(cell);
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
