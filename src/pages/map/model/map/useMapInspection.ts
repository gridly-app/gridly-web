import { useMemo, useState } from "react";
import { cellKey, type Warehouse } from "@/entities/warehouse";
import type { MapEditor } from "../layout/useMapEditor";
import { MapGeometry } from "./MapGeometry";
import { getMapPresentation, inspectMapSelection } from "./mapPresentation";
import type { useRouteEditor } from "./useRouteEditor";

export interface MapInspectionOptions {
	warehouse: Warehouse;
	editor: Pick<MapEditor, "cells" | "selection" | "mode" | "zoneSaved">;
	routeEditor: Pick<ReturnType<typeof useRouteEditor>, "routes" | "block">;
	editing: boolean;
	viewing: boolean;
}

export function useMapInspection({
	warehouse,
	editor,
	routeEditor,
	editing,
	viewing,
}: MapInspectionOptions) {
	const [selectedRobotId, selectRobot] = useState<string | null>(null);
	const { cells } = editor;
	const { selected: selection, selectionKeys } = editor.selection;
	const robot =
		warehouse.robots.find((robot) => robot.id === selectedRobotId) || null;
	const geometry = useMemo(() => new MapGeometry(cells), [cells]);
	const selected = selection
		? (geometry.cellIndex.get(cellKey(selection)) ?? null)
		: null;
	const inspectedCells = geometry.inspect(robot ? null : selected);
	const inspection = inspectMapSelection(warehouse, inspectedCells);
	const configuringRoutes = editing && editor.mode === "routes";
	const presentation = getMapPresentation({
		warehouse,
		geometry,
		selected,
		inspectedCells,
		editing,
		viewing,
		configuringRoutes,
		selectionKeys,
		routeEditor,
	});
	return {
		presentation,
		selectedRobotId,
		selectRobot,
		clearRobot: () => selectRobot(null),
		robot,
		inspection,
	};
}
