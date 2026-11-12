import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Button, Toolbar, ToolbarGroup } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import type { MapEditor } from "../../model/editor/useMapEditor";
import type { useRouteEditor } from "../../model/editor/useRouteEditor";
import styles from "./MapEditorToolbars.module.css";

export interface RouteToolbarProps {
	model: Pick<
		ReturnType<typeof useRouteEditor>,
		| "canRedo"
		| "canUndo"
		| "direction"
		| "error"
		| "redo"
		| "save"
		| "selectDirection"
		| "undo"
	>;
	editor: Pick<
		MapEditor,
		"busy" | "canSave" | "discard" | "errors" | "saveUnavailableReason"
	>;
	pending: boolean;
	className?: string | undefined;
}
export function RouteToolbar({
	model,
	pending,
	editor,
	className = "",
}: RouteToolbarProps) {
	const container = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const element = container.current;
		const workspace = element?.closest<HTMLElement>("[data-map-workspace]");
		if (!element || !workspace) return;
		const observer = new ResizeObserver(() =>
			workspace.style.setProperty(
				"--route-toolbar-height",
				`${element.getBoundingClientRect().height}px`,
			),
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			workspace.style.removeProperty("--route-toolbar-height");
		};
	}, []);
	return (
		<div
			ref={container}
			className={`${styles.routeEditorToolbar} ${className}`}
		>
			<Toolbar
				data-variant="floating"
				aria-label="Настройка маршрутов"
				className={styles.routeRow}
			>
				<ToolbarGroup
					aria-label="Направление маршрута"
					className={styles.controlsRow}
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
				</ToolbarGroup>
				<ToolbarGroup
					aria-label="История изменений маршрута"
					className={styles.controlsRow}
				>
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
				</ToolbarGroup>
				<ToolbarGroup
					aria-label="Сохранение маршрута"
					className={styles.controlsRow}
				>
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
				</ToolbarGroup>
			</Toolbar>

			<ErrorNotice
				className={styles.notice}
				message={editor.errors?.join(" · ") || model.error}
			/>
		</div>
	);
}
