import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { cellLabels } from "@/entities/warehouse";
import { useImmersiveRegion } from "@/shared/lib";
import { ErrorNotice } from "@/shared/ui/feedback";
import { mapThemes } from "../../config/mapTheme";
import { useMapEditor } from "../../model/editor/useMapEditor";
import { useMapSize } from "../../model/editor/useMapSize";
import { useRouteEditor } from "../../model/editor/useRouteEditor";
import { MapSelectionProvider } from "../../model/MapSelectionProvider";
import { useMapInspection } from "../../model/useMapInspection";
import { useMapView } from "../../model/useMapView";
import { useMapCamera } from "../../model/viewport/useMapCamera";
import { useMapCanvas } from "../../model/viewport/useMapCanvas";
import { useMapSimulation } from "../../model/viewport/useMapSimulation";
import { MapDetails } from "../details/MapDetails";
import { MapEditorControls } from "../editor/MapEditorControls";
import { MapCanvas } from "./MapCanvas";
import { MapNavigation } from "./MapNavigation";
import { MapToolbar } from "./MapToolbar";
import mapStyles from "./WarehouseMap.module.css";

export interface WarehouseMapProps {
	w: Warehouse;
	command: CommandExecutor;
	pending: boolean;
	dark: boolean;
}

export function WarehouseMap(props: WarehouseMapProps) {
	const { pending, w: warehouse, command, dark } = props;
	const editor = useMapEditor(warehouse, command);
	const routeEditor = useRouteEditor(editor, warehouse.id);
	const sizeEditor = useMapSize({ w: warehouse, command });
	const view = useMapView(editor.editing);
	const { editing, viewing } = view;
	const immersiveRegion = useRef<HTMLDivElement>(null);
	const viewTrigger = useRef<HTMLButtonElement>(null);
	useImmersiveRegion(viewing, immersiveRegion, viewTrigger);
	const camera = useMapCamera(viewing, warehouse);
	const simulation = useMapSimulation(warehouse, command);
	const mapInspection = useMapInspection({
		warehouse,
		editor,
		routeEditor,
		editing,
		viewing,
	});
	const {
		clearRobot,
		robot,
		inspection,
		presentation,
		selectedRobotId,
		selectRobot,
	} = mapInspection;
	const canvas = useMapCanvas({
		warehouse,
		dark,
		editor,
		routeEditor,
		camera,
		editing,
		inspection: { presentation, selectedRobotId, selectRobot },
	});
	const [menuOpen, setMenuOpen] = useState(false);
	const configuringRoutes = editing && editor.mode === "routes";
	const legend = {
		entries: Object.entries(cellLabels).filter(([type]) => type !== "cold"),
		palette: mapThemes[dark ? "dark" : "light"].cells,
	};

	function startEditor(mode: typeof editor.mode) {
		setMenuOpen(false);
		clearRobot();
		editor.startMode(mode);
	}

	function openSizeEditor() {
		setMenuOpen(false);
		sizeEditor.show();
	}

	return (
		<div
			data-map-workspace=""
			ref={immersiveRegion}
			tabIndex={-1}
			className={`${mapStyles.mapWorkspace} ${
				view.viewing ? mapStyles.mapFullscreen : ""
			} ${
				editor.selection.selected || robot || editing
					? mapStyles.mapShowDetails
					: ""
			}`}
		>
			{view.viewing ? (
				<MapNavigation
					navigation={camera.navigation}
					view={view}
					editor={{
						active: editing,
						busy: editor.busy,
						menuOpen,
						setMenuOpen,
						start: startEditor,
						openSize: openSizeEditor,
						close: editor.toggleEditor,
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
					openView={() => view.setViewing(true)}
				/>
			)}
			<ErrorNotice message={simulation.error} />
			<MapEditorControls
				className={mapStyles.editorOverlay}
				editor={editor}
				editing={editing}
				sizeEditor={sizeEditor}
				routeEditor={routeEditor}
				palette={legend.palette}
				pending={pending}
			/>
			<div className={mapStyles.mapLayout}>
				<MapCanvas
					model={canvas}
					viewing={view.viewing}
					editorMode={editing ? editor.mode : undefined}
				/>
				<MapSelectionProvider
					warehouse={warehouse}
					command={command}
					editor={editor}
					presentation={presentation}
					robot={robot}
					inspection={inspection}
					editing={editing}
				>
					<MapDetails legend={legend} className={mapStyles.mapDetails} />
				</MapSelectionProvider>
			</div>
		</div>
	);
}
