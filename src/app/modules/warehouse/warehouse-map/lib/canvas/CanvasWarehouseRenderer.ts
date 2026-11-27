import type {
	Cell,
	GridPosition,
	Robot,
	Warehouse,
	WarehouseView,
} from "@/domain/warehouse";

import { canvasLength, cellCenter, maxPixelRatio } from "../../config/grid";
import { sameLayout } from "../sameLayout";
import { paintWarehouseLayout } from "./paintWarehouseLayout";
import { paintWarehouseRobot } from "./paintWarehouseRobot";
import {
	isRobotMotionActive,
	prepareRobotMotionTrack,
	type RobotMotionTrack,
	robotMotionPosition,
} from "./robotMotion";

export interface LayoutRenderState {
	warehouse: Pick<Warehouse, "width" | "height">;
	cells: Cell[];
	selected: Cell | null;
	selectionKeys: string[];
	size: number;
	dark: boolean;
	routeDragHandle?: ({ point: GridPosition; index: number } | null) | undefined;
	routeHandles?: ("inbound" | "outbound") | undefined;
	routes?: { inbound: GridPosition[]; outbound: GridPosition[] } | undefined;
}

type GridSize = Pick<Warehouse, "width" | "height">;

const defaultSampleMs = 500;
const minSampleMs = 100;
const maxSampleMs = 2000;
const robotHitRadius = 0.43;

function pixelRatio() {
	return Math.min(devicePixelRatio, maxPixelRatio);
}

function canvasSize(warehouse: GridSize, size: number) {
	return {
		width: canvasLength(warehouse.width, size),
		height: canvasLength(warehouse.height, size),
	};
}

function context2d(
	canvas: HTMLCanvasElement,
	current: CanvasRenderingContext2D | null,
) {
	const context = current ?? canvas.getContext("2d");

	if (!context) throw new Error("Canvas 2D недоступен");

	return context;
}

function resizeCanvas(
	canvas: HTMLCanvasElement,
	cssWidth: number,
	cssHeight: number,
	ratio: number,
) {
	const width = Math.round(cssWidth * ratio);
	const height = Math.round(cssHeight * ratio);
	const isResized = canvas.width !== width || canvas.height !== height;

	if (canvas.width !== width) canvas.width = width;
	if (canvas.height !== height) canvas.height = height;

	return isResized;
}

function motionPath(robot: Robot) {
	const supplied = robot.motionPath ?? [];
	const last = supplied.at(-1);

	return last?.x === robot.x && last?.y === robot.y ? supplied : [];
}

export class CanvasWarehouseRenderer {
	private frame: number | null = null;
	private layoutContext: CanvasRenderingContext2D | null = null;
	private robotsContext: CanvasRenderingContext2D | null = null;
	private layoutState: LayoutRenderState | null = null;
	private layoutRatio = 0;
	private robotsRatio = 0;
	private robotsCssWidth = 0;
	private robotsCssHeight = 0;
	private positions = new Map<string, GridPosition>();
	private tracks = new Map<string, RobotMotionTrack>();
	private sampleTime: number | null = null;
	private sampleDuration = defaultSampleMs;

	constructor(
		private readonly layoutCanvas: HTMLCanvasElement,
		private readonly robotsCanvas: HTMLCanvasElement,
	) {}

	private prepareLayoutFrame(warehouse: GridSize, size: number) {
		const canvas = this.layoutCanvas;
		const ratio = pixelRatio();
		const { width, height } = canvasSize(warehouse, size);
		const cssWidth = `${width}px`;
		const cssHeight = `${height}px`;

		resizeCanvas(canvas, width, height, ratio);

		if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
		if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;

		const context = context2d(canvas, this.layoutContext);

		this.layoutContext = context;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.scale(ratio, ratio);

		return context;
	}

	private prepareRobotsFrame(warehouse: GridSize, size: number) {
		const canvas = this.robotsCanvas;
		const ratio = pixelRatio();
		const { width, height } = canvasSize(warehouse, size);
		const isResized =
			resizeCanvas(canvas, width, height, ratio) || this.robotsRatio !== ratio;

		if (this.robotsCssWidth !== width) {
			canvas.style.width = `${width}px`;
			this.robotsCssWidth = width;
		}

		if (this.robotsCssHeight !== height) {
			canvas.style.height = `${height}px`;
			this.robotsCssHeight = height;
		}

		const context = context2d(canvas, this.robotsContext);

		this.robotsContext = context;

		if (isResized) {
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(ratio, ratio);
			this.robotsRatio = ratio;
		}

		context.clearRect(0, 0, width, height);

		return context;
	}

	private cancelFrame() {
		if (this.frame === null) return;

		cancelAnimationFrame(this.frame);
		this.frame = null;
	}

	private updateSampleDuration(asOf: string | undefined) {
		const sampleTime = Date.parse(asOf || "");

		if (!Number.isFinite(sampleTime) || sampleTime === this.sampleTime) return;

		if (this.sampleTime !== null && sampleTime > this.sampleTime) {
			this.sampleDuration = Math.max(
				minSampleMs,
				Math.min(maxSampleMs, sampleTime - this.sampleTime),
			);
		}

		this.sampleTime = sampleTime;
	}

	private updateTrack(
		robot: Robot,
		asOf: string | undefined,
		startedAt: number,
	) {
		const track = this.tracks.get(robot.id);
		const isCurrent =
			track?.target.x === robot.x &&
			track.target.y === robot.y &&
			track.sample === asOf;

		if (isCurrent) return;

		const path = motionPath(robot);
		const start = { x: path[0]?.x ?? robot.x, y: path[0]?.y ?? robot.y };

		this.tracks.set(
			robot.id,
			prepareRobotMotionTrack({
				timed: robot.motionTimed,
				sample: asOf,
				target: robot,
				path: path.length ? path : [robot],
				startedAt,
				duration: path.length ? this.sampleDuration : 0,
			}),
		);

		const position = this.positions.get(robot.id);

		if (!position) {
			this.positions.set(robot.id, start);

			return;
		}

		position.x = start.x;
		position.y = start.y;
	}

	private forgetMissingRobots(robots: Robot[]) {
		const currentIds = new Set(robots.map((robot) => robot.id));

		for (const id of this.positions.keys()) {
			if (currentIds.has(id)) continue;

			this.positions.delete(id);
			this.tracks.delete(id);
		}
	}

	private positionOf(robot: Robot) {
		const position = this.positions.get(robot.id);

		if (position) return position;

		const created = { x: robot.x, y: robot.y };

		this.positions.set(robot.id, created);

		return created;
	}

	drawLayout(state: LayoutRenderState) {
		const ratio = pixelRatio();
		const isUnchanged =
			this.layoutState &&
			this.layoutRatio === ratio &&
			sameLayout(this.layoutState, state);

		if (isUnchanged) return;

		const context = this.prepareLayoutFrame(state.warehouse, state.size);

		paintWarehouseLayout(context, state);
		this.layoutState = state;
		this.layoutRatio = ratio;
	}

	drawRobots(
		warehouse: Pick<
			WarehouseView<"robots">,
			"width" | "height" | "robots" | "asOf"
		>,
		size: number,
		selectedRobotId?: (string | null) | undefined,
	) {
		this.cancelFrame();

		const isReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const startedAt = performance.now();

		this.updateSampleDuration(warehouse.asOf);

		for (const robot of warehouse.robots) {
			this.updateTrack(robot, warehouse.asOf, startedAt);
		}

		this.forgetMissingRobots(warehouse.robots);

		const render = (now: number) => {
			const context = this.prepareRobotsFrame(warehouse, size);
			let isAnimating = false;

			for (const [index, robot] of warehouse.robots.entries()) {
				const track = this.tracks.get(robot.id);

				if (!track) continue;

				const position = this.positionOf(robot);

				robotMotionPosition(track, isReducedMotion ? Infinity : now, position);
				isAnimating ||= !isReducedMotion && isRobotMotionActive(track, now);
				paintWarehouseRobot(
					context,
					robot,
					position,
					size,
					index,
					robot.id === selectedRobotId,
				);
			}

			this.frame = isAnimating ? requestAnimationFrame(render) : null;
		};

		render(startedAt);
	}

	findRobotAt(x: number, y: number, size: number): string | null {
		const radius = size * robotHitRadius;

		for (const [id, point] of this.positions) {
			const isInside =
				Math.abs(x - cellCenter(point.x, size)) <= radius &&
				Math.abs(y - cellCenter(point.y, size)) <= radius;

			if (isInside) return id;
		}

		return null;
	}

	dispose() {
		this.cancelFrame();
		this.positions.clear();
		this.tracks.clear();
		this.layoutState = null;
		this.layoutRatio = 0;
		this.sampleTime = null;
		this.layoutContext = null;
		this.robotsContext = null;
		this.robotsRatio = 0;
		this.robotsCssWidth = 0;
		this.robotsCssHeight = 0;

		for (const canvas of [this.layoutCanvas, this.robotsCanvas]) {
			const context = canvas.getContext("2d");

			if (!context) continue;

			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, canvas.width, canvas.height);
		}
	}
}
