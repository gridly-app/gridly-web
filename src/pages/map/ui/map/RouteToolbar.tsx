import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Button, ErrorNotice } from "@/shared/ui";
import type { MapEditor } from "../../model/layout/useMapEditor";
import type { useRouteEditor } from "../../model/map/useRouteEditor";
import editorStyles from "../layout/EditLayoutToolbar.module.css";

export interface RouteToolbarProps {
	model: ReturnType<typeof useRouteEditor>;
	editor: MapEditor;
	pending: boolean;
	className?: string | undefined;
	running: boolean;
}

export function RouteToolbar({
	model,
	pending,
	editor,
	className = "",
}: RouteToolbarProps) {
	return (
		<div className={`${editorStyles.routeEditorToolbar} ${className}`}>
			<div
				className={`${editorStyles.controlsRow} ${editorStyles.routeRow} ${editorStyles.editorPill}`}
			>
				<Button
					size="compact"
					variant="ghost"
					disabled={editor.busy}
					selected={model.direction === "inbound"}
					onClick={() => model.selectDirection("inbound")}
				>
					Загрузка склада
				</Button>
				<Button
					size="compact"
					variant="ghost"
					disabled={editor.busy}
					selected={model.direction === "outbound"}
					onClick={() => model.selectDirection("outbound")}
				>
					Отгрузка со склада
				</Button>
				<Button
					size="compact"
					variant="ghost"
					disabled={!model.canUndo}
					onClick={model.undo}
					tooltip="Отменить изменение маршрута"
				>
					<IconArrowBackUp size={16} />
					Отменить
				</Button>
				<Button
					size="compact"
					variant="ghost"
					disabled={!model.canRedo}
					onClick={model.redo}
				>
					<IconArrowForwardUp size={16} />
					Вернуть отменённое
				</Button>
				<Button
					size="compact"
					disabled={pending || editor.busy || !editor.canSave}
					onClick={() => {
						void model.save();
					}}
					tooltip={!editor.canSave ? editor.saveUnavailableReason : undefined}
				>
					Сохранить изменения
				</Button>
				<Button
					size="compact"
					variant="ghost"
					disabled={pending || editor.busy}
					onClick={editor.discard}
				>
					Отменить изменения
				</Button>
			</div>
			<p className={editorStyles.routeHelp}>
				{model.block.length
					? `${model.block[0]?.zone?.name || "Блок хранения"} · ${model.block.length} клеток. Перетаскивайте концы к докам и блоку или любую клетку пути для изменения проходов.`
					: "Выберите блок хранения. Каждый конец и каждая клетка маршрута доступны для перетаскивания."}
			</p>
			<ErrorNotice
				className={editorStyles.notice}
				message={editor.errors?.join(" · ") || model.error}
			/>
		</div>
	);
}
