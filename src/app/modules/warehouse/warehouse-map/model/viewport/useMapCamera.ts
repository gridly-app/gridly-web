import {
	type PointerEvent,
	useEffect,
	useRef,
	useState,
	type WheelEvent,
} from "react";

import type { Warehouse } from "@/domain/warehouse";

type Offset = { x: number; y: number };

const panThreshold = 5;
const defaultViewport = { width: 800, height: 700 };
const viewportPadding = 64;
const minCellSize = 18;
const minZoom = 0.4;
const maxZoom = 2;
const wheelZoomFactor = 0.002;
const origin: Offset = { x: 0, y: 0 };

function useMapPan() {
	const [offset, setOffset] = useState(origin);
	const [panning, setPanning] = useState(false);
	const stack = useRef<HTMLDivElement>(null);
	const offsetRef = useRef(offset);
	const gesture = useRef<{
		x: number;
		y: number;
		origin: Offset;
		moved: boolean;
	} | null>(null);

	function applyTransform(next: Offset) {
		if (stack.current)
			stack.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
	}

	function start(event: PointerEvent<HTMLElement>) {
		gesture.current = {
			x: event.clientX,
			y: event.clientY,
			origin: offsetRef.current,
			moved: false,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent<HTMLElement>) {
		const current = gesture.current;

		if (!current) return;

		const dx = event.clientX - current.x;
		const dy = event.clientY - current.y;

		if (!current.moved && Math.hypot(dx, dy) > panThreshold) {
			current.moved = true;
			setPanning(true);
		}

		if (!current.moved) return;

		const next = { x: current.origin.x + dx, y: current.origin.y + dy };

		offsetRef.current = next;
		applyTransform(next);
	}

	function finish() {
		const moved = gesture.current?.moved ?? false;

		gesture.current = null;
		setPanning(false);

		if (moved) setOffset(offsetRef.current);

		return moved;
	}

	function reset() {
		offsetRef.current = origin;
		setOffset(origin);
		applyTransform(origin);
	}

	return { offset, panning, stack, start, move, finish, reset };
}

function useMapViewport(viewing: boolean) {
	const scroll = useRef<HTMLDivElement>(null);
	const navigation = useRef<HTMLDivElement>(null);
	const [viewport, setViewport] = useState(defaultViewport);

	useEffect(() => {
		const element = navigation.current;
		const workspace = element?.closest<HTMLElement>("[data-map-workspace]");

		if (!element || !workspace || !viewing) return;

		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;

			const height =
				entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;

			workspace.style.setProperty("--map-navigation-height", `${height}px`);
		});

		observer.observe(element);

		return () => {
			observer.disconnect();
			workspace.style.removeProperty("--map-navigation-height");
		};
	}, [viewing]);

	useEffect(() => {
		const element = scroll.current;

		if (!element) return;

		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;

			const { width, height } = entry.contentRect;

			setViewport({ width, height });
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return { scroll, navigation, viewport };
}

export function useMapCamera(
	viewing: boolean,
	warehouse: Pick<Warehouse, "width" | "height">,
) {
	const pan = useMapPan();
	const { scroll, navigation, viewport } = useMapViewport(viewing);
	const [zoom, setZoom] = useState(1);
	const fittedSize = Math.min(
		(viewport.width - viewportPadding) / warehouse.width,
		(viewport.height - viewportPadding) / warehouse.height,
	);
	const size = Math.max(minCellSize, fittedSize) * zoom;

	function changeZoom(delta: number) {
		setZoom((current) => Math.max(minZoom, Math.min(maxZoom, current + delta)));
	}

	function resetZoom() {
		setZoom(1);
		pan.reset();
	}

	function onWheel(event: WheelEvent<HTMLDivElement>) {
		if (!event.ctrlKey) return;

		event.preventDefault();
		changeZoom(-event.deltaY * wheelZoomFactor);
	}

	return {
		pan,
		scroll,
		navigation,
		size,
		zoom,
		changeZoom,
		resetZoom,
		onWheel,
	};
}
