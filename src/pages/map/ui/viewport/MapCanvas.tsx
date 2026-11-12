import { IconFocus2, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { Button, Toolbar } from "@/shared/ui/controls";
import type { MapCanvasModel } from "../../model/viewport/useMapCanvas";
import mapStyles from "./MapCanvas.module.css";

export interface MapCanvasProps {
	model: MapCanvasModel;
	viewing: boolean;
	editorMode?: ("construction" | "routes") | undefined;
}

export function MapCanvas({ model, viewing, editorMode }: MapCanvasProps) {
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
				onPointerDown={handlers.onPointerDown}
				onPointerMove={handlers.onPointerMove}
				onPointerUp={handlers.onPointerUp}
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
