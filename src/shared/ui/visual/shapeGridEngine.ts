// Adapted from React Bits Shape Grid. License: docs/react-bits-LICENSE.md.
// https://github.com/DavidHDev/react-bits

import {
	clamp,
	flatView,
	type Point,
	project,
	viewFor,
} from "./shapeGridGeometry";

export interface ShapeGridColors {
	lineColor: string;
	hoverColor: string;
}

interface ShapeGridEngine {
	redraw: () => void;
	stop: () => void;
}

const CELL_SIZE = 48;
const LINE_WIDTH = 1;
const SCROLL_SPEED = 0.18 * 60 * Math.SQRT1_2;
const HOVER_RADIUS = 1.5 * CELL_SIZE;
const HOVER_TRAIL = 0.6;
const HOVER_FILL = 0.12;
const HOVER_GLOW = 0.15;
const OFFSET = 32768;
const MAX_PIXELS = 8e6;

const smoothstep = (edge0: number, edge1: number, value: number) => {
	const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
};

export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const keyOf = (i: number, j: number) => (i + OFFSET) * 65536 + (j + OFFSET);

const centerOf = (i: number, j: number): Point => [
	(i + 0.5) * CELL_SIZE,
	(j + 0.5) * CELL_SIZE,
];

export function startShapeGrid(
	container: HTMLDivElement,
	canvas: HTMLCanvasElement,
	getColors: () => ShapeGridColors,
	reduce: boolean,
): ShapeGridEngine | undefined {
	const ctx = canvas.getContext("2d");
	if (!ctx) return undefined;

	const state = {
		alive: true,
		raf: 0,
		last: 0,
		time: 0,
		visible: true,
		width: 1,
		height: 1,
		ratio: 1,
		view: flatView(1, 1),
		offsetX: 0,
		offsetY: 0,
		started: false,
		startedAt: 0,
		inside: false,
		pointerX: 0,
		pointerY: 0,
		spotX: 0,
		spotY: 0,
		spotVX: 0,
		spotVY: 0,
		spotPower: 0,
		lit: new Map<number, number>(),
	};

	const resize = () => {
		const width = Math.max(1, container.clientWidth);
		const height = Math.max(1, container.clientHeight);
		const view = viewFor(12, -8, width, height, CELL_SIZE);
		let ratio = Math.min(window.devicePixelRatio, 2);
		const pixels = view.width * view.height * ratio * ratio;
		if (pixels > MAX_PIXELS) ratio *= Math.sqrt(MAX_PIXELS / pixels);
		state.width = width;
		state.height = height;
		state.ratio = ratio;
		state.view = view;
		const pixelWidth = Math.max(1, Math.round(view.width * ratio));
		const pixelHeight = Math.max(1, Math.round(view.height * ratio));
		if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
			canvas.width = pixelWidth;
			canvas.height = pixelHeight;
		}
		const cssWidth = `${view.width}px`;
		const cssHeight = `${view.height}px`;
		if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
		if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;
		if (canvas.style.transform !== view.transform)
			canvas.style.transform = view.transform;
	};

	const toPlane = (x: number, y: number): Point | null => {
		const { inverse, far } = state.view;
		if (!inverse) return [x, y];
		if (inverse[6] * x + inverse[7] * y + inverse[8] < 1 / far) return null;
		return project(inverse, x, y);
	};

	const illuminate = (dt: number) => {
		const decay = Math.exp(-dt / HOVER_TRAIL);

		for (const [key, value] of state.lit) {
			const next = value * decay;

			if (next < 0.004) {
				state.lit.delete(key);
				continue;
			}

			state.lit.set(key, next);
		}

		if (state.spotPower < 0.01) return;

		const wx = state.spotX + state.offsetX;
		const wy = state.spotY + state.offsetY;
		const column = Math.ceil(wx / CELL_SIZE) - 1;
		const row = Math.ceil(wy / CELL_SIZE) - 1;
		const span = Math.ceil(HOVER_RADIUS / CELL_SIZE) + 2;

		for (let i = column - span; i <= column + span; i++) {
			for (let j = row - span; j <= row + span; j++) {
				const [x, y] = centerOf(i, j);
				const distance = Math.hypot(x - wx, y - wy);
				const intensity =
					i === column && j === row
						? 1
						: smoothstep(HOVER_RADIUS, HOVER_RADIUS * 0.15, distance);
				const value = intensity * state.spotPower;
				const key = keyOf(i, j);

				if (value > 0.004 && value > (state.lit.get(key) ?? 0)) {
					state.lit.set(key, value);
				}
			}
		}
	};

	const draw = () => {
		const { view, ratio } = state;
		const { lineColor, hoverColor } = getColors();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = 1;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(ratio, 0, 0, ratio, -view.x0 * ratio, -view.y0 * ratio);

		const left = view.x0;
		const top = view.y0;
		const right = view.x0 + view.width;
		const bottom = view.y0 + view.height;
		const i0 = Math.floor((state.offsetX + left - CELL_SIZE) / CELL_SIZE) - 1;
		const i1 = Math.ceil((state.offsetX + right + CELL_SIZE) / CELL_SIZE) + 1;
		const j0 = Math.floor((state.offsetY + top - CELL_SIZE) / CELL_SIZE) - 1;
		const j1 = Math.ceil((state.offsetY + bottom + CELL_SIZE) / CELL_SIZE) + 1;
		const introRadius = reduce
			? Infinity
			: (state.time - state.startedAt) * view.reach * 1.8;
		const originX = state.width / 2;
		const originY = state.height / 2;
		const centerX = originX + state.offsetX;
		const centerY = originY + state.offsetY;

		ctx.lineWidth = LINE_WIDTH;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.strokeStyle = lineColor;
		ctx.beginPath();

		for (let i = i0; i <= i1; i++) {
			const x = i * CELL_SIZE - state.offsetX;
			ctx.moveTo(x, top - CELL_SIZE);
			ctx.lineTo(x, bottom + CELL_SIZE);
		}

		for (let j = j0; j <= j1; j++) {
			const y = j * CELL_SIZE - state.offsetY;
			ctx.moveTo(left - CELL_SIZE, y);
			ctx.lineTo(right + CELL_SIZE, y);
		}

		ctx.stroke();

		if (introRadius !== Infinity) {
			const gradient = ctx.createRadialGradient(
				originX,
				originY,
				0,
				originX,
				originY,
				Math.max(1, introRadius),
			);
			gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
			gradient.addColorStop(0.82, "rgba(0, 0, 0, 1)");
			gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.globalCompositeOperation = "destination-in";
			ctx.fillStyle = gradient;
			ctx.fillRect(left, top, view.width, view.height);
			ctx.globalCompositeOperation = "source-over";
		}

		const highlightSize = CELL_SIZE - LINE_WIDTH;

		for (let i = i0; i <= i1; i++) {
			for (let j = j0; j <= j1; j++) {
				const [cx, cy] = centerOf(i, j);
				const front = introRadius - Math.hypot(cx - centerX, cy - centerY);

				if (front < 0) continue;

				const wave = Math.exp(-((front / (CELL_SIZE * 1.4)) ** 2)) * 0.85;
				const value = Math.max(state.lit.get(keyOf(i, j)) ?? 0, wave);

				if (value <= 0.01) continue;

				const x = cx - state.offsetX - highlightSize / 2;
				const y = cy - state.offsetY - highlightSize / 2;
				const alpha = Math.min(1, value);

				ctx.beginPath();
				ctx.rect(x, y, highlightSize, highlightSize);
				ctx.globalAlpha = alpha * HOVER_FILL;
				ctx.fillStyle = hoverColor;
				ctx.fill();
				ctx.globalAlpha = alpha * 0.85;
				ctx.shadowColor = hoverColor;
				ctx.shadowBlur = HOVER_GLOW * 16 * value;
				ctx.strokeStyle = hoverColor;
				ctx.stroke();
				ctx.shadowBlur = 0;
			}
		}
		ctx.globalAlpha = 1;

		if (view.mist) {
			const [mx0, my0, mx1, my1] = view.mist;
			const gradient = ctx.createLinearGradient(mx0, my0, mx1, my1);
			for (let k = 0; k <= 8; k++) {
				const t = k / 8;
				gradient.addColorStop(
					t,
					`rgba(0, 0, 0, ${(1 - smootherstep(t)).toFixed(3)})`,
				);
			}
			ctx.globalCompositeOperation = "destination-in";
			ctx.fillStyle = gradient;
			ctx.fillRect(left, top, view.width, view.height);
			ctx.globalCompositeOperation = "source-over";
		}
	};

	const frame = (now: number) => {
		state.raf = 0;
		if (!state.alive) return;
		const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
		state.last = now;
		resize();
		if (!state.started) {
			state.started = true;
			state.startedAt = state.time;
		}
		state.time += dt;

		if (!reduce) {
			state.offsetX -= SCROLL_SPEED * dt;
			state.offsetY += SCROLL_SPEED * dt;
		}

		const want = state.inside ? 1 : 0;
		const stiffness = 220;
		const damping = 2 * Math.sqrt(stiffness) * 0.85;

		state.spotPower +=
			(want - state.spotPower) * (1 - Math.exp(-(want ? 10 : 5) * dt));
		state.spotVX +=
			(stiffness * (state.pointerX - state.spotX) - damping * state.spotVX) *
			dt;
		state.spotVY +=
			(stiffness * (state.pointerY - state.spotY) - damping * state.spotVY) *
			dt;
		state.spotX += state.spotVX * dt;
		state.spotY += state.spotVY * dt;

		illuminate(dt);
		draw();

		const settled =
			reduce &&
			state.lit.size === 0 &&
			state.spotPower < 0.005 &&
			state.time - state.startedAt > 3;

		if (!settled && state.visible) state.raf = requestAnimationFrame(frame);
		else state.last = 0;
	};

	const wake = () => {
		if (!state.raf && state.alive && state.visible)
			state.raf = requestAnimationFrame(frame);
	};

	const pointFrom = (event: PointerEvent) => {
		const rect = container.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
		return toPlane(x, y);
	};

	const onMove = (event: PointerEvent) => {
		if (reduce) return;
		const point = pointFrom(event);
		if (point && !state.inside && state.spotPower < 0.02) {
			state.spotX = point[0];
			state.spotY = point[1];
			state.spotVX = 0;
			state.spotVY = 0;
		}
		state.inside = point !== null;
		if (point) {
			state.pointerX = point[0];
			state.pointerY = point[1];
			wake();
		}
	};

	const onLeave = () => {
		state.inside = false;
	};

	const resizeObserver = new ResizeObserver(() => {
		resize();
		draw();
		wake();
	});
	resizeObserver.observe(container);

	const visibility = new IntersectionObserver((entries) => {
		state.visible = entries.some((entry) => entry.isIntersecting);
		if (state.visible) wake();
	});
	visibility.observe(container);

	window.addEventListener("pointermove", onMove, { passive: true });
	document.documentElement.addEventListener("pointerleave", onLeave);
	window.addEventListener("blur", onLeave);

	resize();
	wake();

	return {
		redraw: () => {
			resize();
			draw();
			wake();
		},
		stop: () => {
			state.alive = false;
			cancelAnimationFrame(state.raf);
			resizeObserver.disconnect();
			visibility.disconnect();
			window.removeEventListener("pointermove", onMove);
			document.documentElement.removeEventListener("pointerleave", onLeave);
			window.removeEventListener("blur", onLeave);
		},
	};
}
