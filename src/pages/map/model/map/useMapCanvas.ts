import type {
	KeyboardEventHandler,
	PointerEventHandler,
	RefObject,
	WheelEventHandler,
} from "react";
import type { Warehouse } from "@/entities/warehouse";
import type { MapEditor } from "../layout/useMapEditor";
import { createMapHandlers } from "./createMapHandlers";
import type { getMapPresentation } from "./mapPresentation";
import type { useMapCamera } from "./useMapCamera";
import { useMapRenderer } from "./useMapRenderer";
import type { useRouteEditor } from "./useRouteEditor";

export interface MapCanvasOptions {
	warehouse: Warehouse;
	dark: boolean;
	editor: MapEditor;
	routeEditor: ReturnType<typeof useRouteEditor>;
	camera: ReturnType<typeof useMapCamera>;
	editing: boolean;
	inspection: {
		presentation: ReturnType<typeof getMapPresentation>;
		selectedRobotId: string | null;
		selectRobot: (id: string | null) => void;
	};
}

export interface MapCanvasModel {
	ref: RefObject<HTMLCanvasElement | null>;
	dynamic: RefObject<HTMLCanvasElement | null>;
	scroll: RefObject<HTMLDivElement | null>;
	stack: RefObject<HTMLDivElement | null>;
	width: number;
	height: number;
	size: number;
	panOffset: { x: number; y: number };
	panning: boolean;
	zoom: number;
	editing: boolean;
	changeZoom: (delta: number) => void;
	resetZoom: () => void;
	handlers: {
		onWheel: WheelEventHandler<HTMLDivElement>;
		onPointerDown: PointerEventHandler<HTMLElement>;
		onPointerMove: PointerEventHandler<HTMLElement>;
		onPointerUp: PointerEventHandler<HTMLElement>;
		onPointerCancel: PointerEventHandler<HTMLElement>;
		onKeyDown: KeyboardEventHandler<HTMLCanvasElement>;
	};
}

export function useMapCanvas({
	warehouse,
	dark,
	editor,
	routeEditor,
	camera,
	editing,
	inspection,
}: MapCanvasOptions): MapCanvasModel {
	const { cells } = editor;
	const { selected } = editor.selection;
	const { presentation, selectedRobotId, selectRobot } = inspection;
	const configuringRoutes = editing && editor.mode === "routes";
	const rendering = useMapRenderer({
		w: warehouse,
		cells,
		selected,
		selectionKeys: presentation.highlightedKeys,
		size: camera.size,
		dark,
		routes: presentation.routes,
		routeDragHandle: routeEditor.drag.dragHandle,
		routeHandles: configuringRoutes ? routeEditor.direction : undefined,
		robots: warehouse.robots,
		asOf: warehouse.asOf,
		selectedRobotId,
	});
	const handlers = createMapHandlers({
		warehouse,
		editor,
		cellIndex: presentation.cellIndex,
		routeEditor,
		editing,
		configuringRoutes,
		camera,
		rendering,
		selectRobot,
	});

	return {
		ref: rendering.canvas,
		dynamic: rendering.dynamic,
		scroll: camera.scroll,
		stack: camera.pan.stack,
		width: warehouse.width,
		height: warehouse.height,
		size: camera.size,
		panOffset: camera.pan.offset,
		panning: camera.pan.panning,
		zoom: camera.zoom,
		changeZoom: camera.changeZoom,
		resetZoom: camera.resetZoom,
		editing,
		handlers: { ...handlers, onWheel: camera.onWheel },
	};
}
