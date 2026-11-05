import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Button, ErrorNotice, Toolbar, ToolbarGroup } from "@/shared/ui";
import type { MapEditor } from "../../model/layout/useMapEditor";
import type { useRouteEditor } from "../../model/map/useRouteEditor";
import styles from "../layout/EditLayoutToolbar.module.css";

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
