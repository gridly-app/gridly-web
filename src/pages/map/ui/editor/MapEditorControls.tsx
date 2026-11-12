import { ConfirmDialog } from "@/shared/ui/overlays";
import type { MapEditor } from "../../model/editor/useMapEditor";
import type { useMapSize } from "../../model/editor/useMapSize";
import {
	EditLayoutToolbar,
	type EditLayoutToolbarProps,
} from "./EditLayoutToolbar";
import { MapSizeDialog } from "./MapSizeDialog";
import { RouteToolbar, type RouteToolbarProps } from "./RouteToolbar";

interface MapEditorControlsProps {
	editor: EditLayoutToolbarProps["editor"] &
		RouteToolbarProps["editor"] &
		Pick<
			MapEditor,
			"mode" | "categories" | "discardOpen" | "confirmDiscard" | "cancelDiscard"
		>;
	editing: boolean;
	sizeEditor: ReturnType<typeof useMapSize>;
	routeEditor: RouteToolbarProps["model"];
	palette: EditLayoutToolbarProps["palette"];
	pending: boolean;
	className?: string | undefined;
}

export function MapEditorControls({
	editor,
	editing,
	sizeEditor,
	routeEditor,
	palette,
	pending,
	className,
}: MapEditorControlsProps) {
	return (
		<>
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
			{editing && editor.mode === "construction" && (
				<EditLayoutToolbar
					className={className}
					editor={editor}
					pending={pending}
					palette={palette}
					categories={editor.categories}
				/>
			)}
			{editing && editor.mode === "routes" && (
				<RouteToolbar
					className={className}
					model={routeEditor}
					editor={editor}
					pending={pending}
				/>
			)}
		</>
	);
}
