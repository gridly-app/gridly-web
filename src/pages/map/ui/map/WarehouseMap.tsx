import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { cellLabels } from "@/entities/warehouse";
import { useImmersiveRegion } from "@/shared/lib";
import {
	Button,
	ConfirmDialog,
	ErrorNotice,
	StableLabel,
	StatusBadge,
	Toolbar,
} from "@/shared/ui";
import { useMapEditor } from "../../model/layout/useMapEditor";
import { MapSelectionProvider } from "../../model/map/MapSelectionProvider";
import { mapThemes } from "../../model/map/mapTheme";
import { useMapCamera } from "../../model/map/useMapCamera";
import { useMapCanvas } from "../../model/map/useMapCanvas";
import { useMapInspection } from "../../model/map/useMapInspection";
import { useMapSimulation } from "../../model/map/useMapSimulation";
import { useMapSize } from "../../model/map/useMapSize";
import { useMapView } from "../../model/map/useMapView";
import { useRouteEditor } from "../../model/map/useRouteEditor";
import { EditLayoutToolbar } from "../layout/EditLayoutToolbar";
import { MapCanvas } from "./MapCanvas";
import { MapDetails } from "./MapDetails";
import { MapNavigation } from "./MapNavigation";
import { MapSizeDialog } from "./MapSizeDialog";
import { RouteToolbar } from "./RouteToolbar";
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
		entries: Object.entries(cellLabels),
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
				<Toolbar aria-label="Действия карты" className={mapStyles.mapToolbar}>
					<StatusBadge
						compactOnMobile
						status={warehouse.running ? "online" : "offline"}
						primaryText={`${simulation.activeRobots ?? "—"} в работе`}
						animated={warehouse.running}
					>
						/ {warehouse.summary?.robotCount ?? "—"} роботов
					</StatusBadge>
					<div className={mapStyles.toolbarActions}>
						{simulation.supported && (
							<Button
								className={mapStyles.toolbarButton}
								variant="ghost"
								onClick={() => {
									void simulation.toggle();
								}}
								disabled={pending}
							>
								<StableLabel variants={["Пауза", "Продолжить"]}>
									{warehouse.running ? "Пауза" : "Продолжить"}
								</StableLabel>
							</Button>
						)}
						<Button
							className={mapStyles.toolbarButton}
							ref={viewTrigger}
							variant="secondary"
							onClick={() => view.setViewing(true)}
							tooltip="Открыть карту на всю рабочую область"
						>
							Режим просмотра
						</Button>
					</div>
				</Toolbar>
			)}
			<MapSizeDialog model={sizeEditor} />
			<ConfirmDialog
				open={editor.discardOpen}
				title="Сбросить изменения карты?"
				description="Изменения карты, зон и маршрутов будут отменены. Редактор останется открытым."
				confirmLabel="Сбросить изменения"
				pending={editor.resetting}
				error={editor.errors?.join(" · ")}
				onConfirm={editor.confirmDiscard}
				onCancel={editor.cancelDiscard}
			/>
			<ErrorNotice message={simulation.error} />
			{editing && editor.mode === "construction" && (
				<EditLayoutToolbar
					className={mapStyles.editorOverlay}
					editor={editor}
					pending={pending}
					running={warehouse.running}
					palette={legend.palette}
					categories={editor.categories}
				/>
			)}
			{configuringRoutes && (
				<RouteToolbar
					className={mapStyles.editorOverlay}
					model={routeEditor}
					editor={editor}
					pending={pending}
					running={warehouse.running}
				/>
			)}
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
					<MapDetails legend={legend} />
				</MapSelectionProvider>
			</div>
		</div>
	);
}
