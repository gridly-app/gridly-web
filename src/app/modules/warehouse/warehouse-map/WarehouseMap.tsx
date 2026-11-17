import { useEffect, useRef, useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import { cellKey, cellLabels } from "@/domain/warehouse";
import { useNavigationConfirmation } from "@/ports/navigation";
import {
	type LayoutOperation,
	useLayoutOperation,
	useLiveWarehouseScreen,
} from "@/ports/warehouse";
import { useImmersiveRegion, useTheme } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice, Feedback, RetryButton } from "@/shared/ui/feedback";
import { mapThemes } from "./config/mapTheme";
import { LayoutIssueList } from "./ui/LayoutIssueList/LayoutIssueList";
import { layoutStatus } from "./model/draft/layoutStatus";
import { useMapEditor } from "./model/draft/useMapEditor";
import { MapLayout } from "./map.compose";
import { useMapSize } from "./model/editor/useMapSize";
import { useRouteEditor } from "./model/editor/useRouteEditor";
import { getMapInspectionModel } from "./model/getMapInspectionModel";
import { useMapInspection } from "./model/useMapInspection";
import { useMapView } from "./model/useMapView";
import { useMapCamera } from "./model/viewport/useMapCamera";
import { useMapCanvas } from "./model/viewport/useMapCanvas";
import { useMapSimulation } from "./model/viewport/useMapSimulation";
import { type MapWarehouse, warehouseFields } from "./model/warehouseFields";
import { MapNavigation } from "./ui/MapNavigation/MapNavigation";
import { MapToolbar } from "./ui/MapToolbar/MapToolbar";
import mapStyles from "./shared.module.css";

interface WarehouseMapProps {
	warehouse: MapWarehouse;
	command: CommandExecutor;
	pending: boolean;
	dark: boolean;
	layout: {
		operation: LayoutOperation | null;
		retryRead(): Promise<void>;
		discardRejected(): void;
	};
}

export function MapPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScreen(warehouseFields);
	const { dark } = useTheme();
	const layout = useLayoutOperation(warehouse.id);

	return (
		<WarehouseMap
			key={warehouse.id}
			warehouse={warehouse}
			command={execute}
			pending={pending}
			dark={dark}
			layout={layout}
		/>
	);
}

export function WarehouseMap({
	warehouse,
	command,
	pending,
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
	useNavigationConfirmation((currentPath, nextPath) => {
		if (!hasUnsubmittedChanges || currentPath === nextPath) return;
		if (
			currentPath.startsWith("/sandbox/") &&
			!nextPath.startsWith("/sandbox/")
		)
			return;

		return {
			title: "Покинуть карту?",
			description: "Несохранённые изменения планировки будут потеряны.",
			cancelLabel: "Остаться",
			confirmLabel: "Покинуть карту",
		};
	});
	useEffect(() => {
		if (!hasUnsubmittedChanges) return;

		function preventUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
			event.returnValue = "";
		}

		window.addEventListener("beforeunload", preventUnload);

		return () => window.removeEventListener("beforeunload", preventUnload);
	}, [hasUnsubmittedChanges]);
	const sizeEditor = useMapSize({
		w: warehouse,
		command,
		blocked:
			editor.editing ||
			editor.writeBlocked ||
			warehouse.draftRevision !== undefined,
	});
	const view = useMapView(editor.editing, editor.recovered);
	const needsComparison = editor.versionChanged || editor.hasConflict;
	const [comparePublished, setComparePublished] = useState(false);
	const isComparing = needsComparison && comparePublished;
	const editing = view.editing && !isComparing;
	const visibleEditor = isComparing
		? { ...editor, cells: warehouse.cells }
		: editor;
	const immersiveRegion = useRef<HTMLDivElement>(null);
	const viewTrigger = useRef<HTMLButtonElement>(null);
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
	const status = layoutStatus(layout.operation);
	const canRetryRead =
		layout.operation?.status === "refresh-failed" ||
		layout.operation?.status === "conflict";
	const [menuOpen, setMenuOpen] = useState(false);
	const configuringRoutes = editing && editor.mode === "routes";
	const legend = {
		entries: Object.entries(cellLabels).filter(([type]) => type !== "cold"),
		palette: mapThemes[dark ? "dark" : "light"].cells,
	};

	function handleStartEditor(mode: typeof editor.mode) {
		setMenuOpen(false);
		selectRobot(null);
		editor.startMode(mode);
	}

	function handleOpenSizeEditor() {
		setMenuOpen(false);
		sizeEditor.show();
	}

	const layoutOperation = layout.operation;
	const saveIssues =
		layoutOperation?.command.action === "saveMap"
			? layoutOperation.issues
			: undefined;
	const resizeIssues =
		layoutOperation?.command.action === "resize"
			? layoutOperation.issues
			: undefined;
	const widthError = resizeIssues?.find(
		(issue) => issue.kind === "field" && issue.field === "width",
	)?.message;
	const heightError = resizeIssues?.find(
		(issue) => issue.kind === "field" && issue.field === "height",
	)?.message;
	const selectedCell = editor.selection.selected;
	const selectedKey = selectedCell && cellKey(selectedCell);
	const cellErrors = saveIssues
		?.filter((issue) => issue.kind === "cell" && issue.key === selectedKey)
		.map((issue) => issue.message);

	const inspector = getMapInspectionModel({
		warehouse,
		command,
		editor: visibleEditor,
		presentation,
		selected: mapInspection.selected,
		robot,
		inspection,
		editing,
	});
	const sizeControls = { ...sizeEditor, widthError, heightError };
	const className = [
		mapStyles.mapWorkspace,
		view.viewing && mapStyles.mapFullscreen,
		(selectedCell || robot || editing) && mapStyles.mapShowDetails,
	]
		.filter(Boolean)
		.join(" ");

	function handleOpenView() {
		view.setViewing(true);
	}

	function handleToggleComparison() {
		setComparePublished(!isComparing);
	}

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
					view={view}
					editor={{
						active: editing,
						busy: editor.busy || isComparing,
						menuOpen,
						setMenuOpen,
						start: handleStartEditor,
						openSize: handleOpenSizeEditor,
						close: editor.closeEditor,
					}}
					routes={{
						configuring: configuringRoutes,
						optimize: routeEditor.optimize,
						supported: !!warehouse.allowedActions?.includes("optimize-routes"),
						optimizing: routeEditor.optimizing,
					}}
				/>
			) : (
				<MapToolbar
					running={warehouse.running}
					robotCount={warehouse.summary?.robotCount}
					pending={pending}
					simulation={simulation}
					viewTrigger={viewTrigger}
					openView={handleOpenView}
				/>
			)}
			<ErrorNotice message={simulation.error} />
			{status && (
				<Feedback
					tone="warning"
					action={
						canRetryRead ? (
							<RetryButton onRetry={layout.retryRead} />
						) : undefined
					}
				>
					{status}
				</Feedback>
			)}
			{needsComparison && (
				<Feedback
					tone="warning"
					action={
						<Button variant="secondary" onClick={handleToggleComparison}>
							{isComparing
								? "Вернуться к черновику"
								: "Показать сохранённую карту"}
						</Button>
					}
				>
					{isComparing
						? "Показана сохранённая планировка."
						: "Сверьте черновик с сохранённой планировкой перед новой записью."}
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
				pending={pending}
				canvas={canvas}
				viewing={view.viewing}
				inspection={inspector}
				legend={legend}
				cellErrors={cellErrors}
			/>
		</div>
	);
}
