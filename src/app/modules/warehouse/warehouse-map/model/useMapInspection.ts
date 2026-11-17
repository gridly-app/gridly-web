import { useMemo, useState } from "react";
import { cellKey } from "@/domain/warehouse";
import { MapGeometry } from "@/domain/warehouse/layout";
import { useSelectionSummary } from "@/ports/warehouse";
import type { MapEditor } from "./draft/useMapEditor";
import type { useRouteEditor } from "./editor/useRouteEditor";
import { getMapPresentation, inspectMapSelection } from "./mapPresentation";
import type { MapWarehouse } from "./warehouseFields";

export interface MapInspectionOptions {
	warehouse: MapWarehouse;
	editor: Pick<MapEditor, "cells" | "selection" | "mode">;
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
	const summary = useSelectionSummary(
		warehouse.id,
		inspectedCells.map(cellKey),
		!editing,
	);
	const inspection = {
		...inspectMapSelection(warehouse, inspectedCells),
		capacity: summary.data?.capacity,
		batchCount: summary.data?.batchCount,
	};
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
		selected,
		robot,
		inspection,
	};
}
