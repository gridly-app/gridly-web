import { IconFocus2, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import type { PointerEvent } from "react";
import { Button, Toolbar } from "@/shared/ui/controls";
import mapStyles from "./MapViewport.module.css";
import type { MapViewportModel } from "./model/MapViewportModel";
import { pointerHit } from "./model/pointerHit";

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

	function hit(event: PointerEvent<HTMLElement>) {
		const bounds = canvas.current?.getBoundingClientRect();
		if (!bounds) return undefined;

		return pointerHit(event, bounds, size, model.gridInset);
	}

	return (
		<div className={mapStyles.mapPanel}>
			<div
				data-editing={model.editing}
				data-viewing={viewing}
				data-editor={editorMode}
				ref={scroll}
				data-map-scroll=""
				className={`${mapStyles.mapScroll} ${model.panning ? mapStyles.isPanning : ""}`}
				onWheel={handlers.onWheel}
				onPointerDown={(event) => handlers.onPointerDown(event, hit(event))}
				onPointerMove={(event) => handlers.onPointerMove(event, hit(event))}
				onPointerUp={(event) => handlers.onPointerUp(event, hit(event))}
				onPointerCancel={handlers.onPointerCancel}
			>
				<div
					ref={stack}
					className={mapStyles.canvasStack}
					style={{
						transform: `translate(${model.panOffset.x}px, ${model.panOffset.y}px)`,
						width: width * size + 48,
						height: height * size + 48,
					}}
				>
					<canvas
						ref={canvas}
						data-map-width={width}
						data-map-height={height}
						tabIndex={0}
						aria-label={
							model.editing
								? "Карта склада. Стрелки выбирают клетку, Enter выделяет клетку"
								: "Карта склада. Нажмите на клетку или используйте стрелки для просмотра информации"
						}
						onKeyDown={handlers.onKeyDown}
					/>
					<canvas ref={dynamic} className={mapStyles.dynamic} inert />
				</div>
			</div>
			<Toolbar
				data-variant="floating"
				aria-label="Масштаб карты"
				className={mapStyles.mapBottom}
			>
				<div className={mapStyles.zoomActions}>
					<Button
						size="sm"
						className={mapStyles.zoomButton}
						variant="ghost"
						aria-label="Уменьшить"
						onClick={() => changeZoom(-0.1)}
					>
						<IconZoomOut size={16} />
					</Button>
					<span>{Math.round(zoom * 100)}%</span>
					<Button
						size="sm"
						className={mapStyles.zoomButton}
						variant="ghost"
						aria-label="Увеличить"
						onClick={() => changeZoom(0.1)}
					>
						<IconZoomIn size={16} />
					</Button>
					<Button
						size="sm"
						className={mapStyles.zoomButton}
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
