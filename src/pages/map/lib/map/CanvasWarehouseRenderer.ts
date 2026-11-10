import type { Cell, GridPosition, Warehouse } from "@/entities/warehouse";

import { paintWarehouseLayout } from "./paintWarehouseLayout";
import type { RobotMotionTrack } from "./robotMotion";
import {
	isRobotMotionActive,
	prepareRobotMotionTrack,
	robotMotionPosition,
} from "./robotMotion";
import { sameLayout } from "./sameLayout";

export interface LayoutRenderState {
	w: Pick<Warehouse, "width" | "height">;
	cells: Cell[];
	selected: Cell | null;
	selectionKeys: string[];
	size: number;
	dark: boolean;
	routeDragHandle?: ({ point: GridPosition; index: number } | null) | undefined;
	routeHandles?: ("inbound" | "outbound") | undefined;
	routes?:
		| {
				inbound: GridPosition[];
				outbound: GridPosition[];
		  }
		| undefined;
}

export interface MapRenderer {
	drawLayout(state: LayoutRenderState): void;
	drawRobots(
		warehouse: Pick<Warehouse, "width" | "height" | "robots" | "asOf">,
		size: number,
		selectedRobotId?: (string | null) | undefined,
	): void;
	findRobotAt(x: number, y: number, size: number): string | null;
	dispose(): void;
}

const ROBOT_ROUTE_DASH = [5, 3];

export class CanvasWarehouseRenderer implements MapRenderer {
	private frame: number | null = null;

	private layoutContext: CanvasRenderingContext2D | null = null;

	private robotsContext: CanvasRenderingContext2D | null = null;

	private robotsDpr = 0;

	private robotsCssWidth = 0;

	private robotsCssHeight = 0;

	private positions = new Map<string, GridPosition>();

	private tracks = new Map<string, RobotMotionTrack>();

	private layoutState: LayoutRenderState | null = null;
	private layoutDpr = 0;

	private sampleTime: number | null = null;

	private sampleDuration = 500;

	constructor(
		private readonly layoutCanvas: HTMLCanvasElement,
		private readonly robotsCanvas: HTMLCanvasElement,
	) {}

	private prepare(
		el: HTMLCanvasElement,
		warehouse: Pick<Warehouse, "width" | "height">,
		size: number,
	) {
		const dpr = Math.min(devicePixelRatio, 2);

		const width = Math.round((warehouse.width * size + 48) * dpr);
		const height = Math.round((warehouse.height * size + 48) * dpr);

		if (el.width !== width || el.height !== height) {
			el.width = width;
			el.height = height;
		}
		const cssWidth = `${warehouse.width * size + 48}px`;
		const cssHeight = `${warehouse.height * size + 48}px`;

		if (el.style.width !== cssWidth) el.style.width = cssWidth;
		if (el.style.height !== cssHeight) el.style.height = cssHeight;
		const context = this.layoutContext || el.getContext("2d");

		if (!context) {
			throw new Error("Canvas 2D недоступен");
		}
		this.layoutContext = context;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, el.width, el.height);
		context.scale(dpr, dpr);

		return context;
	}

	private prepareRobotsFrame(
		warehouse: Pick<Warehouse, "width" | "height">,
		size: number,
	) {
		const dpr = Math.min(devicePixelRatio, 2);
		const cssWidth = warehouse.width * size + 48;
		const cssHeight = warehouse.height * size + 48;
		const width = Math.round(cssWidth * dpr);
		const height = Math.round(cssHeight * dpr);
		const canvas = this.robotsCanvas;
		const resized =
			canvas.width !== width ||
			canvas.height !== height ||
			this.robotsDpr !== dpr;

		if (canvas.width !== width) canvas.width = width;
		if (canvas.height !== height) canvas.height = height;
		if (this.robotsCssWidth !== cssWidth) {
			canvas.style.width = `${cssWidth}px`;
			this.robotsCssWidth = cssWidth;
		}
		if (this.robotsCssHeight !== cssHeight) {
			canvas.style.height = `${cssHeight}px`;
			this.robotsCssHeight = cssHeight;
		}

		const context = this.robotsContext || canvas.getContext("2d");

		if (!context) {
			throw new Error("Canvas 2D недоступен");
		}
		this.robotsContext = context;

		if (resized) {
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(dpr, dpr);
			this.robotsDpr = dpr;
		}

		context.clearRect(0, 0, cssWidth, cssHeight);

		return context;
	}

	drawLayout(state: LayoutRenderState) {
		const dpr = Math.min(devicePixelRatio, 2);
		if (
			this.layoutState &&
			this.layoutDpr === dpr &&
			sameLayout(this.layoutState, state)
		)
			return;
		const context = this.prepare(this.layoutCanvas, state.w, state.size);
		paintWarehouseLayout(context, state);
		this.layoutState = state;
		this.layoutDpr = dpr;
	}

	drawRobots(
		warehouse: Pick<Warehouse, "width" | "height" | "robots" | "asOf">,
		size: number,
		selectedRobotId?: (string | null) | undefined,
	) {
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
			this.frame = null;
		}
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const start = performance.now();
		const sampleTime = Date.parse(warehouse.asOf || "");

		if (Number.isFinite(sampleTime) && sampleTime !== this.sampleTime) {
			if (this.sampleTime !== null && sampleTime > this.sampleTime) {
				this.sampleDuration = Math.max(
					100,
					Math.min(2000, sampleTime - this.sampleTime),
				);
			}
			this.sampleTime = sampleTime;
		}
		for (const robot of warehouse.robots) {
			const track = this.tracks.get(robot.id);

			if (
				track &&
				track.target.x === robot.x &&
				track.target.y === robot.y &&
				track.sample === warehouse.asOf
			) {
				continue;
			}
			const supplied = robot.motionPath ?? [];
			const last = supplied.at(-1);
			const path = last?.x === robot.x && last?.y === robot.y ? supplied : [];

			const nextTrack = prepareRobotMotionTrack({
				timed: robot.motionTimed,
				sample: warehouse.asOf,
				target: robot,
				path: path.length ? path : [robot],
				startedAt: start,
				duration: path.length ? this.sampleDuration : 0,
			});
			this.tracks.set(robot.id, nextTrack);

			const currentPosition = this.positions.get(robot.id);

			if (currentPosition) {
				currentPosition.x = path[0]?.x ?? robot.x;
				currentPosition.y = path[0]?.y ?? robot.y;
			} else {
				this.positions.set(robot.id, {
					x: path[0]?.x ?? robot.x,
					y: path[0]?.y ?? robot.y,
				});
			}
		}
		const currentIds = new Set(warehouse.robots.map((robot) => robot.id));

		for (const id of this.positions.keys()) {
			if (!currentIds.has(id)) {
				this.positions.delete(id);
				this.tracks.delete(id);
			}
		}
		const render = (now: number) => {
			let animating = false;
			const ctx = this.prepareRobotsFrame(warehouse, size);

			for (let index = 0; index < warehouse.robots.length; index += 1) {
				const robot = warehouse.robots[index];
				if (!robot) continue;
				const track = this.tracks.get(robot.id);
				if (!track) continue;
				let position = this.positions.get(robot.id);

				if (!position) {
					position = { x: robot.x, y: robot.y };
					this.positions.set(robot.id, position);
				}
				const { x: xCell, y: yCell } = robotMotionPosition(
					track,
					reduced ? Infinity : now,
					position,
				);

				animating ||= !reduced && isRobotMotionActive(track, now);
				const x = 32 + xCell * size + size / 2;
				const y = 32 + yCell * size + size / 2;

				const route = robot.currentTask?.route || robot.returnRoute;

				if (robot.id === selectedRobotId && route?.length) {
					ctx.save();
					ctx.strokeStyle = robot.currentTask?.carrying ? "#4f83c4" : "#e86536";
					ctx.lineWidth = Math.max(2, size * 0.08);
					ctx.setLineDash(ROBOT_ROUTE_DASH);
					ctx.beginPath();
					ctx.moveTo(x, y);
					for (const point of route) {
						ctx.lineTo(
							32 + (point.x + 0.5) * size,
							32 + (point.y + 0.5) * size,
						);
					}
					ctx.stroke();
					ctx.restore();
				}
				ctx.fillStyle = robot.currentTask?.carrying
					? "#e86536"
					: robot.status === "waiting"
						? "#e9ac4b"
						: robot.status === "idle"
							? "#8b9580"
							: "#596bc2";
				ctx.beginPath();
				ctx.roundRect(
					x - size * 0.34,
					y - size * 0.32,
					size * 0.68,
					size * 0.64,
					5,
				);
				ctx.fill();
				if (robot.id === selectedRobotId) {
					ctx.strokeStyle = "#e86536";
					ctx.lineWidth = 2;
					ctx.strokeRect(
						x - size * 0.43,
						y - size * 0.43,
						size * 0.86,
						size * 0.86,
					);
				}
				ctx.fillStyle = "white";
				ctx.font = `bold ${Math.max(10, size * 0.27)}px Geist, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillText(String(index + 1).padStart(2, "0"), x, y + 4);
			}
			this.frame = animating ? requestAnimationFrame(render) : null;
		};

		render(start);
	}

	findRobotAt(x: number, y: number, size: number): string | null {
		for (const [id, point] of this.positions) {
			if (
				Math.abs(x - (32 + (point.x + 0.5) * size)) <= size * 0.43 &&
				Math.abs(y - (32 + (point.y + 0.5) * size)) <= size * 0.43
			) {
				return id;
			}
		}

		return null;
	}

	dispose() {
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
			this.frame = null;
		}
		this.positions.clear();
		this.tracks.clear();
		this.layoutState = null;
		this.layoutDpr = 0;
		this.sampleTime = null;
		this.layoutContext = null;
		this.robotsContext = null;
		this.robotsDpr = 0;
		this.robotsCssWidth = 0;
		this.robotsCssHeight = 0;
		for (const canvas of [this.layoutCanvas, this.robotsCanvas]) {
			const context = canvas.getContext("2d");

			if (context) {
				context.setTransform(1, 0, 0, 1, 0, 0);
				context.clearRect(0, 0, canvas.width, canvas.height);
			}
		}
	}
}
