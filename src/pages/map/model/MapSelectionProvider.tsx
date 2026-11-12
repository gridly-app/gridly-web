import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type {
	Category,
	Cell,
	CommandExecutor,
	Robot,
	Warehouse,
} from "@/entities/warehouse";
import type { MapEditor } from "./editor/useMapEditor";
import type {
	getMapPresentation,
	inspectMapSelection,
} from "./mapPresentation";

interface MapSelectionContextValue {
	warehouse: Warehouse;
	command: CommandExecutor;
	onCategory: (category: Category) => void;
	cells: Cell[];
	selected: Cell | null;
	robot: Robot | null;
	editing: boolean;
	busy: boolean;
	selectionKeys: string[];
	selectionError: string;
	clearSelection: () => void;
	zoneKeys: string[];
	canAssignZone: boolean;
	zonePanelKey: string;
	onDraft: (cells: Cell[]) => void;
	routes: ReturnType<typeof getMapPresentation>["routes"];
	inspection: ReturnType<typeof inspectMapSelection>;
	constructing: boolean;
}

const MapSelectionContext = createContext<MapSelectionContextValue | null>(
	null,
);

export interface MapSelectionProviderProps {
	warehouse: Warehouse;
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
	presentation: ReturnType<typeof getMapPresentation>;
	robot: Robot | null;
	inspection: ReturnType<typeof inspectMapSelection>;
	editing: boolean;
	children: ReactNode;
}

export function MapSelectionProvider({
	warehouse,
	command,
	editor,
	presentation,
	robot,
	inspection,
	editing,
	children,
}: MapSelectionProviderProps) {
	const value: MapSelectionContextValue = {
		warehouse: editing
			? { ...warehouse, categories: editor.categories }
			: warehouse,
		onCategory: editor.addCategory,
		command,
		cells: editor.cells,
		selected:
			editor.cells.find(
				(c) =>
					c.x === editor.selection.selected?.x &&
					c.y === editor.selection.selected?.y,
			) ?? null,
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

	return (
		<MapSelectionContext.Provider value={value}>
			{children}
		</MapSelectionContext.Provider>
	);
}

export function useMapSelection() {
	const selection = useContext(MapSelectionContext);

	if (!selection) {
		throw new Error("useMapSelection must be used within MapSelectionProvider");
	}

	return selection;
}
