import { IconFocus2, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import type { PointerEvent } from "react";

import { Button, Toolbar } from "@/shared/ui/controls";

import type { MapViewportModel } from "./model/MapViewportModel";
import { pointerHit } from "./model/pointerHit";

import styles from "./MapViewport.module.css";

const zoomStep = 0.1;

export interface MapViewportProps {
	model: MapViewportModel;
	viewing: boolean;
	editorMode?: ("construction" | "routes") | undefined;
}

export function MapViewport({ model, viewing, editorMode }: MapViewportProps) {
	const {
		changeZoom,
		resetZoom,
		scroll,
		stack,
		width,
		height,
		size,
		ref: canvas,
		dynamic,
		zoom,
		handlers,
	} = model;
	const scrollClassName = [styles.mapScroll, model.panning && styles.isPanning]
		.filter(Boolean)
		.join(" ");
	const stackStyle = {
		transform: `translate(${model.panOffset.x}px, ${model.panOffset.y}px)`,
		width: width * size + model.canvasPadding,
		height: height * size + model.canvasPadding,
	};
	const canvasLabel = model.editing
		? "Карта склада. Стрелки выбирают клетку, Enter выделяет клетку"
		: "Карта склада. Нажмите на клетку или используйте стрелки для просмотра информации";

	function hit(event: PointerEvent<HTMLElement>) {
		const bounds = canvas.current?.getBoundingClientRect();

		if (!bounds) return undefined;

		return pointerHit(event, bounds, size, model.gridInset);
	}

	function handleZoomOut() {
		changeZoom(-zoomStep);
	}

	function handleZoomIn() {
		changeZoom(zoomStep);
	}

	return (
		<div className={styles.mapPanel}>
			<div
				data-editing={model.editing}
				data-viewing={viewing}
				data-editor={editorMode}
				ref={scroll}
				data-map-scroll=""
				className={scrollClassName}
				onWheel={handlers.onWheel}
				onPointerDown={(event) => handlers.onPointerDown(event, hit(event))}
				onPointerMove={(event) => handlers.onPointerMove(event, hit(event))}
				onPointerUp={(event) => handlers.onPointerUp(event, hit(event))}
				onPointerCancel={handlers.onPointerCancel}
			>
				<div ref={stack} className={styles.canvasStack} style={stackStyle}>
					<canvas
						ref={canvas}
						data-map-width={width}
						data-map-height={height}
						tabIndex={0}
						aria-label={canvasLabel}
						onKeyDown={handlers.onKeyDown}
					/>
					<canvas ref={dynamic} className={styles.dynamic} inert />
				</div>
			</div>
			<Toolbar
				data-variant="floating"
				aria-label="Масштаб карты"
				className={styles.mapBottom}
			>
				<div className={styles.zoomActions}>
					<Button
						size="sm"
						className={styles.zoomButton}
						variant="ghost"
						aria-label="Уменьшить"
						onClick={handleZoomOut}
					>
						<IconZoomOut size={16} />
					</Button>
					<span>{Math.round(zoom * 100)}%</span>
					<Button
						size="sm"
						className={styles.zoomButton}
						variant="ghost"
						aria-label="Увеличить"
						onClick={handleZoomIn}
					>
						<IconZoomIn size={16} />
					</Button>
					<Button
						size="sm"
						className={styles.zoomButton}
						variant="ghost"
						aria-label="Сбросить масштаб"
						onClick={resetZoom}
					>
						<IconFocus2 size={16} />
					</Button>
				</div>
			</Toolbar>
		</div>
	);
}
