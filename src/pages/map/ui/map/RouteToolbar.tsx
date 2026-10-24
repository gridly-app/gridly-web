import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Button, ErrorNotice } from "@/shared/ui";
import type { useRouteEditor } from "../../model/map/useRouteEditor";
import editorStyles from "../layout/EditLayoutToolbar.module.css";

export interface RouteToolbarProps {
	model: ReturnType<typeof useRouteEditor>;
	pending: boolean;
	className?: string;
	running: boolean;
}

export function RouteToolbar({
	model,
	pending,
	running,
	className = "",
}: RouteToolbarProps) {
	return (
		<div className={`${editorStyles["route-editor-toolbar"]} ${className}`}>
			<div
				className={`${editorStyles.controlsRow} ${editorStyles.routeRow} ${editorStyles["editor-pill"]}`}
			>
				<Button
					size="compact"
					variant="ghost"
					selected={model.direction === "inbound"}
					onClick={() => model.selectDirection("inbound")}
				>
					Загрузка склада
				</Button>
				<Button
					size="compact"
					variant="ghost"
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
					disabled={pending || running || !model.dirty}
					onClick={() => {
						void model.save();
					}}
					tooltip={
						running ? "Поставьте демо на паузу перед сохранением" : undefined
					}
				>
					Сохранить маршруты
				</Button>
			</div>
			<p className={editorStyles.routeHelp}>
				{model.block.length
					? `${model.block[0].zone?.name || "Блок хранения"} · ${model.block.length} клеток. Перетаскивайте концы к докам и блоку или любую клетку пути для изменения проходов.`
					: "Выберите блок хранения. Каждый конец и каждая клетка маршрута доступны для перетаскивания."}
			</p>
			<ErrorNotice className={editorStyles.notice} message={model.error} />
		</div>
	);
}
