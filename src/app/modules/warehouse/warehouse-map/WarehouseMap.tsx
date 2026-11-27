import { useRef, useState } from "react";

import {
	cellKey,
	cellLabels,
	type CellType,
	type CommandExecutor,
} from "@/domain/warehouse";
import {
	type LayoutOperation,
	useLayoutOperation,
	useLiveWarehouseScreen,
} from "@/ports/warehouse";
import { useImmersiveRegion, useTheme } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";

import { mapThemes } from "./config/mapTheme";
import { MapLayout } from "./map.compose";
import type { EditorMode } from "./model/draft/editorState";
import { useMapEditor } from "./model/draft/useMapEditor";
import { useUnsavedLayoutWarning } from "./model/draft/useUnsavedLayoutWarning";
import { useMapSize } from "./model/editor/useMapSize";
import { useRouteEditor } from "./model/editor/useRouteEditor";
import { getMapInspectionModel } from "./model/getMapInspectionModel";
import { layoutIssueView } from "./model/layoutIssueView";
import { useMapInspection } from "./model/useMapInspection";
import { useMapView } from "./model/useMapView";
import { useMapCamera } from "./model/viewport/useMapCamera";
import { useMapCanvas } from "./model/viewport/useMapCanvas";
import { useMapSimulation } from "./model/viewport/useMapSimulation";
import {
	type MapWarehouse,
	warehouseResources,
} from "./model/warehouseResources";
import { LayoutIssueList } from "./ui/LayoutIssueList/LayoutIssueList";
import { LayoutOperationFeedback } from "./ui/LayoutOperationFeedback/LayoutOperationFeedback";
import { MapNavigation } from "./ui/MapNavigation/MapNavigation";
import { MapToolbar } from "./ui/MapToolbar/MapToolbar";

import styles from "./shared.module.css";

interface WarehouseMapProps {
	warehouse: MapWarehouse;
	command: CommandExecutor;
	isPending: boolean;
	dark: boolean;
	layout: {
		operation: LayoutOperation | null;
		retryRead(): Promise<void>;
		discardRejected(): void;
	};
}

const legendEntries = (
	Object.entries(cellLabels) as [CellType, string][]
).filter(([type]) => type !== "cold");

export function MapPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScreen(warehouseResources);
	const { dark } = useTheme();
	const layout = useLayoutOperation(warehouse.id);

	return (
		<WarehouseMap
			key={warehouse.id}
			warehouse={warehouse}
			command={execute}
			isPending={pending}
			dark={dark}
			layout={layout}
		/>
	);
}

export function WarehouseMap({
	warehouse,
	command,
	isPending,
	dark,
	layout,
}: WarehouseMapProps) {
	const editor = useMapEditor(
		warehouse,
		command,
		layout.operation,
		layout.discardRejected,
	);
	const routeEditor = useRouteEditor(editor, warehouse.id);
	const hasUnsubmittedChanges =
		editor.dirty && !editor.saving && !editor.resetting && !editor.writeBlocked;

	useUnsavedLayoutWarning(hasUnsubmittedChanges);

	const isSizeBlocked =
		editor.editing ||
		editor.writeBlocked ||
		warehouse.draftRevision !== undefined;
	const sizeEditor = useMapSize({ warehouse, command, blocked: isSizeBlocked });
	const view = useMapView(editor.editing, editor.recovered);
	const [comparePublished, setComparePublished] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const immersiveRegion = useRef<HTMLDivElement>(null);
	const viewTrigger = useRef<HTMLButtonElement>(null);
	const needsComparison = editor.versionChanged || editor.hasConflict;
	const isComparing = needsComparison && comparePublished;
	const editing = view.editing && !isComparing;
	const visibleEditor = isComparing
		? { ...editor, cells: warehouse.cells }
		: editor;

	useImmersiveRegion(view.viewing, immersiveRegion, viewTrigger);

	const camera = useMapCamera(view.viewing, warehouse);
	const simulation = useMapSimulation(warehouse, command);
	const mapInspection = useMapInspection({
		warehouse,
		editor: visibleEditor,
		routeEditor,
		editing,
		viewing: view.viewing,
	});
	const { robot, inspection, presentation, selectedRobotId, selectRobot } =
		mapInspection;
	const canvas = useMapCanvas({
		warehouse,
		dark,
		editor: visibleEditor,
		routeEditor,
		camera,
		editing,
		inspection: { presentation, selectedRobotId, selectRobot },
	});
	const legend = {
		entries: legendEntries,
		palette: mapThemes[dark ? "dark" : "light"].cells,
	};
	const selectedCell = editor.selection.selected;
	const selectedKey = selectedCell ? cellKey(selectedCell) : null;
	const { saveIssues, widthError, heightError, cellErrors } = layoutIssueView(
		layout.operation,
		selectedKey,
	);
	const inspector = getMapInspectionModel({
		warehouse,
		editor: visibleEditor,
		presentation,
		selected: mapInspection.selected,
		robot,
		inspection,
		editing,
	});
	const sizeControls = { ...sizeEditor, widthError, heightError };
	const hasDetails = Boolean(selectedCell || robot || editing);
	const className = [
		styles.mapWorkspace,
		view.viewing && styles.mapFullscreen,
		hasDetails && styles.mapShowDetails,
	]
		.filter(Boolean)
		.join(" ");
	const comparisonLabel = isComparing
		? "Вернуться к черновику"
		: "Показать сохранённую карту";
	const comparisonMessage = isComparing
		? "Показана сохранённая планировка."
		: "Сверьте черновик с сохранённой планировкой перед новой записью.";

	function handleStartEditor(mode: EditorMode) {
		setMenuOpen(false);
		selectRobot(null);
		editor.startMode(mode);
	}

	function handleOpenSizeEditor() {
		setMenuOpen(false);
		sizeEditor.show();
	}

	function handleOpenView() {
		view.setViewing(true);
	}

	function handleExitView() {
		view.setViewing(false);
	}

	function handleToggleComparison() {
		setComparePublished(!isComparing);
	}

	const navigationEditor = {
		active: editing,
		busy: editor.busy || isComparing,
		menuOpen,
		setMenuOpen,
		start: handleStartEditor,
		openSize: handleOpenSizeEditor,
		close: editor.closeEditor,
	};
	const navigationRoutes = {
		configuring: editing && editor.mode === "routes",
		optimize: routeEditor.optimize,
		supported: Boolean(warehouse.allowedActions?.includes("optimize-routes")),
		optimizing: routeEditor.optimizing,
	};

	return (
		<div
			data-map-workspace=""
			ref={immersiveRegion}
			tabIndex={-1}
			className={className}
		>
			{view.viewing ? (
				<MapNavigation
					navigation={camera.navigation}
					editor={navigationEditor}
					routes={navigationRoutes}
					onExitView={handleExitView}
				/>
			) : (
				<MapToolbar
					running={warehouse.running}
					robotCount={simulation.robotCount}
					isPending={isPending}
					simulation={simulation}
					viewTrigger={viewTrigger}
					onOpenView={handleOpenView}
				/>
			)}
			<ErrorNotice message={simulation.error} />
			<LayoutOperationFeedback
				operation={layout.operation}
				onRetryRead={layout.retryRead}
			/>
			{needsComparison && (
				<Feedback
					tone="warning"
					action={
						<Button variant="secondary" onClick={handleToggleComparison}>
							{comparisonLabel}
						</Button>
					}
				>
					{comparisonMessage}
				</Feedback>
			)}
			{saveIssues && (
				<LayoutIssueList
					issues={saveIssues}
					cells={presentation.cellIndex}
					onSelectCell={editor.selection.setSelected}
				/>
			)}
			<MapLayout
				editor={editor}
				editing={editing}
				sizeEditor={sizeControls}
				routeEditor={routeEditor}
				pending={isPending}
				canvas={canvas}
				viewing={view.viewing}
				inspection={inspector}
				legend={legend}
				cellErrors={cellErrors}
			/>
		</div>
	);
}
