import type { Cell, CommandExecutor, Robot } from "@/domain/warehouse";
import type { MapEditor } from "../draft/useMapEditor";
import type { useMapInspection } from "./useMapInspection";
import type { MapWarehouse } from "./warehouseFields";

interface MapInspectionInput {
	warehouse: MapWarehouse;
	command: CommandExecutor;
	editor: Pick<
		MapEditor,
		| "cells"
		| "selection"
		| "mode"
		| "zoneSaved"
		| "categories"
		| "addCategory"
		| "busy"
	>;
	presentation: ReturnType<typeof useMapInspection>["presentation"];
	selected: Cell | null;
	robot: Robot | null;
	inspection: ReturnType<typeof useMapInspection>["inspection"];
	editing: boolean;
}

export function getMapInspectionModel({
	warehouse,
	command,
	editor,
	presentation,
	selected,
	robot,
	inspection,
	editing,
}: MapInspectionInput) {
	return {
		warehouse: editing
			? { ...warehouse, categories: editor.categories }
			: warehouse,
		onCategory: editor.addCategory,
		command,
		cells: editor.cells,
		selected,
		robot,
		editing,
		busy: editor.busy,
		selectionKeys: editor.selection.selectionKeys,
		selectionError: editor.selection.selectionError,
		clearSelection: editor.selection.clearSelection,
		zoneKeys: presentation.zoneKeys,
		canAssignZone: presentation.canAssignZone,
		zonePanelKey: presentation.zonePanelKey,
		onDraft: editor.zoneSaved,
		routes: presentation.routes,
		inspection,
		constructing: editing && editor.mode === "construction",
	};
}
