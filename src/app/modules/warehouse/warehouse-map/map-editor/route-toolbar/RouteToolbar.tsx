import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

import { Button, Toolbar, ToolbarGroup } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";

import styles from "./RouteToolbar.module.css";

type RouteDirection = "inbound" | "outbound";

export interface RouteToolbarProps {
	model: {
		canRedo: boolean;
		canUndo: boolean;
		direction: RouteDirection;
		error: string;
		redo: () => void;
		save: () => Promise<void>;
		selectDirection: (direction: RouteDirection) => void;
		undo: () => void;
	};
	editor: {
		busy: boolean;
		canSave: boolean;
		discard: () => void;
		errors: string[] | null;
		saveUnavailableReason: string | undefined;
	};
	pending: boolean;
	className?: string | undefined;
	onHeightChange?: ((height: number | undefined) => void) | undefined;
}

export function RouteToolbar({
	model,
	pending,
	editor,
	className = "",
	onHeightChange,
}: RouteToolbarProps) {
	const container = useRef<HTMLDivElement>(null);
	const saveHint = editor.canSave ? undefined : editor.saveUnavailableReason;
	const errorMessage = editor.errors?.join(" · ") || model.error;

	useEffect(() => {
		const element = container.current;

		if (!element || !onHeightChange) return;

		function measure() {
			if (element) onHeightChange?.(element.getBoundingClientRect().height);
		}

		const observer = new ResizeObserver(measure);

		observer.observe(element);
		measure();

		return () => {
			observer.disconnect();
			onHeightChange(undefined);
		};
	}, [onHeightChange]);

	function handleInbound() {
		model.selectDirection("inbound");
	}

	function handleOutbound() {
		model.selectDirection("outbound");
	}

	function handleSave() {
		void model.save();
	}

	return (
		<div
			ref={container}
			data-map-editor-menu=""
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
						onClick={handleInbound}
					>
						Загрузка склада
					</Button>
					<Button
						size="compact"
						variant="ghost"
						disabled={editor.busy}
						selected={model.direction === "outbound"}
						onClick={handleOutbound}
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
						onClick={handleSave}
						tooltip={saveHint}
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
			<ErrorNotice className={styles.notice} message={errorMessage} />
		</div>
	);
}
