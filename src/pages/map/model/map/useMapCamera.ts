import { type PointerEvent, useEffect, useRef, useState } from "react";

import type { Warehouse } from "@/entities/warehouse";

function useMapPan() {
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [panning, setPanning] = useState(false);
	const stack = useRef<HTMLDivElement>(null);
	const offsetRef = useRef(offset);
	const gesture = useRef<{
		x: number;
		y: number;
		origin: typeof offset;
		moved: boolean;
	} | null>(null);

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

		if (!current) {
			return;
		}
		const dx = event.clientX - current.x;
		const dy = event.clientY - current.y;

		if (Math.hypot(dx, dy) > 5 && !current.moved) {
			current.moved = true;
			setPanning(true);
		}
		if (current.moved) {
			const next = { x: current.origin.x + dx, y: current.origin.y + dy };

			offsetRef.current = next;
			if (stack.current) {
				stack.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
			}
		}
	}

	function finish() {
		const moved = gesture.current?.moved ?? false;

		gesture.current = null;
		setPanning(false);
		if (moved) {
			setOffset(offsetRef.current);
		}

		return moved;
	}

	function reset() {
		offsetRef.current = { x: 0, y: 0 };
		setOffset({ x: 0, y: 0 });
		if (stack.current) {
			stack.current.style.transform = "translate(0px, 0px)";
		}
	}

	return { offset, panning, stack, start, move, finish, reset };
}

function useMapViewport(viewing: boolean) {
	const scroll = useRef<HTMLDivElement>(null);
	const navigation = useRef<HTMLDivElement>(null);
	const [viewport, setViewport] = useState({ width: 800, height: 700 });

	useEffect(() => {
		const element = navigation.current;
		const workspace = element?.closest<HTMLElement>("[data-map-workspace]");

		if (!element || !viewing) {
			return;
		}
		const observer = new ResizeObserver(([entry]) =>
			workspace?.style.setProperty(
				"--map-navigation-height",
				`${entry.borderBoxSize[0]?.blockSize || entry.contentRect.height}px`,
			),
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
			workspace?.style.removeProperty("--map-navigation-height");
		};
	}, [viewing]);

	useEffect(() => {
		const element = scroll.current;

		if (!element) {
			return;
		}
		const observer = new ResizeObserver(([entry]) =>
			setViewport({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			}),
		);

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
	const size =
		Math.max(
			18,
			Math.min(
				(viewport.width - 64) / warehouse.width,
				(viewport.height - 64) / warehouse.height,
			),
		) * zoom;

	function changeZoom(delta: number) {
		setZoom((current) => Math.max(0.4, Math.min(2, current + delta)));
	}

	function resetZoom() {
		setZoom(1);
		pan.reset();
	}

	function onWheel(event: React.WheelEvent<HTMLDivElement>) {
		if (event.ctrlKey) {
			event.preventDefault();
			changeZoom(-event.deltaY * 0.002);
		}
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
