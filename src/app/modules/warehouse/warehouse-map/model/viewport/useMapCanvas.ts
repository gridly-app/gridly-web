import { gridInset } from "../../config/grid";
import type { MapEditor } from "../draft/useMapEditor";
import type { useRouteEditor } from "../editor/useRouteEditor";
import type { getMapPresentation } from "../mapPresentation";
import type { MapWarehouse } from "../warehouseFields";
import { createMapHandlers } from "./createMapHandlers";
import type { useMapCamera } from "./useMapCamera";
import { useMapRenderer } from "./useMapRenderer";

export interface MapCanvasOptions {
	warehouse: MapWarehouse;
	dark: boolean;
	editor: Pick<
		MapEditor,
		"cells" | "mode" | "selection" | "closeEditor" | "busy"
	>;
	routeEditor: Pick<
		ReturnType<typeof useRouteEditor>,
		"direction" | "drag" | "select"
	>;
	camera: Pick<
		ReturnType<typeof useMapCamera>,
		"changeZoom" | "onWheel" | "pan" | "resetZoom" | "scroll" | "size" | "zoom"
	>;
	editing: boolean;
	inspection: {
		presentation: ReturnType<typeof getMapPresentation>;
		selectedRobotId: string | null;
		selectRobot: (id: string | null) => void;
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
}: MapCanvasOptions) {
	const { cells } = editor;
	const { selected } = editor.selection;
	const { presentation, selectedRobotId, selectRobot } = inspection;
	const configuringRoutes = editing && editor.mode === "routes";
	const rendering = useMapRenderer({
		warehouse,
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
		gridInset,
		panOffset: camera.pan.offset,
		panning: camera.pan.panning,
		zoom: camera.zoom,
		changeZoom: camera.changeZoom,
		resetZoom: camera.resetZoom,
		editing,
		handlers: { ...handlers, onWheel: camera.onWheel },
	};
}
