import type { Category } from "@/domain/warehouse";
import { ConfirmDialog } from "@/shared/ui/overlays";

import { RouteToolbar, type RouteToolbarProps } from "./route-toolbar";
import {
	EditLayoutToolbar,
	type EditLayoutToolbarProps,
} from "./ui/EditLayoutToolbar/EditLayoutToolbar";
import {
	MapSizeDialog,
	type MapSizeDialogProps,
} from "./ui/MapSizeDialog/MapSizeDialog";

interface MapEditorProps {
	editor: EditLayoutToolbarProps["editor"] &
		RouteToolbarProps["editor"] & {
			mode: "construction" | "routes";
			categories: Category[];
			discardOpen: boolean;
			confirmDiscard: () => Promise<void>;
			cancelDiscard: () => void;
		};
	editing: boolean;
	sizeEditor: MapSizeDialogProps["model"];
	routeEditor: RouteToolbarProps["model"];
	palette: EditLayoutToolbarProps["palette"];
	pending: boolean;
	className?: string | undefined;
	onHeightChange: (height: number | undefined) => void;
}

export function MapEditor({
	editor,
	editing,
	sizeEditor,
	routeEditor,
	palette,
	pending,
	className,
	onHeightChange,
}: MapEditorProps) {
	const isConstruction = editing && editor.mode === "construction";
	const isRoutes = editing && editor.mode === "routes";

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
			{isConstruction && (
				<EditLayoutToolbar
					className={className}
					editor={editor}
					pending={pending}
					palette={palette}
					categories={editor.categories}
					onHeightChange={onHeightChange}
				/>
			)}
			{isRoutes && (
				<RouteToolbar
					className={className}
					model={routeEditor}
					onHeightChange={onHeightChange}
					editor={editor}
					pending={pending}
				/>
			)}
		</>
	);
}
