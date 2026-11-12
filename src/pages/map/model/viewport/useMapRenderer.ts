import { useEffect, useRef } from "react";
import type { Warehouse } from "@/entities/warehouse";
import type { LayoutRenderState } from "../../lib/canvas/CanvasWarehouseRenderer";
import {
	CanvasWarehouseRenderer,
	type MapRenderer,
} from "../../lib/canvas/CanvasWarehouseRenderer";

export interface MapRendererOptions extends LayoutRenderState {
	robots: Warehouse["robots"];
	asOf?: string | undefined;
	selectedRobotId: string | null;
}

export function useMapRenderer({
	w: { width, height },
	cells,
	selected,
	selectionKeys,
	size,
	dark,
	routes,
	routeDragHandle,
	routeHandles,
	robots,
	asOf,
	selectedRobotId,
}: MapRendererOptions) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const dynamic = useRef<HTMLCanvasElement>(null);
	const renderer = useRef<MapRenderer | null>(null);

	useEffect(() => {
		if (!canvas.current || !dynamic.current) {
			return;
		}
		const instance = new CanvasWarehouseRenderer(
			canvas.current,
			dynamic.current,
		);

		renderer.current = instance;

		return () => {
			instance.dispose();
			renderer.current = null;
		};
	}, []);
	useEffect(() => {
		renderer.current?.drawLayout({
			w: { width, height },
			cells,
			selected,
			selectionKeys,
			size,
			dark,
			routes,
			routeDragHandle,
			routeHandles,
		});
	}, [
		width,
		height,
		cells,
		selected,
		selectionKeys,
		size,
		dark,
		routes,
		routeDragHandle,
		routeHandles,
	]);
	useEffect(() => {
		renderer.current?.drawRobots(
			{ width, height, robots, asOf },
			size,
			selectedRobotId,
		);
	}, [width, height, robots, asOf, size, selectedRobotId]);

	return { canvas, dynamic, renderer };
}
