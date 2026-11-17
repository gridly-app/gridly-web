import type {
	KeyboardEventHandler,
	PointerEvent,
	RefObject,
	WheelEventHandler,
} from "react";
import type { PointerHit } from "./pointerHit";

type MapPointerHandler = (
	event: PointerEvent<HTMLElement>,
	hit?: PointerHit,
) => void;

export interface MapViewportModel {
	ref: RefObject<HTMLCanvasElement | null>;
	dynamic: RefObject<HTMLCanvasElement | null>;
	scroll: RefObject<HTMLDivElement | null>;
	stack: RefObject<HTMLDivElement | null>;
	width: number;
	height: number;
	size: number;
	gridInset: number;
	panOffset: { x: number; y: number };
	panning: boolean;
	zoom: number;
	editing: boolean;
	changeZoom: (delta: number) => void;
	resetZoom: () => void;
	handlers: {
		onWheel: WheelEventHandler<HTMLDivElement>;
		onPointerDown: MapPointerHandler;
		onPointerMove: MapPointerHandler;
		onPointerUp: MapPointerHandler;
		onPointerCancel: MapPointerHandler;
		onKeyDown: KeyboardEventHandler<HTMLCanvasElement>;
	};
}
