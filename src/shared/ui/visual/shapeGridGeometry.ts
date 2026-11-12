// Adapted from React Bits Shape Grid. License: docs/react-bits-LICENSE.md.
// https://github.com/DavidHDev/react-bits

export interface Layout {
	stepX: number;
	stepY: number;
	radius?: number;
	side?: number;
}

export type Point = [number, number];
type Matrix = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
];

interface View {
	x0: number;
	y0: number;
	width: number;
	height: number;
	inverse: Matrix | null;
	transform: string;
	mist: [number, number, number, number] | null;
	far: number;
	reach: number;
}

const SQRT3 = Math.sqrt(3);
const FAR = 2.5;

export const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const multiply = (a: Matrix, b: Matrix): Matrix =>
	[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
		const r = k - (k % 3);
		const c = k % 3;
		return (
			(a[r] ?? 0) * (b[c] ?? 0) +
			(a[r + 1] ?? 0) * (b[c + 3] ?? 0) +
			(a[r + 2] ?? 0) * (b[c + 6] ?? 0)
		);
	}) as Matrix;

const invert = (m: Matrix): Matrix => {
	const [a, b, c, d, e, f, g, h, i] = m;
	const A = e * i - f * h;
	const B = f * g - d * i;
	const C = d * h - e * g;
	const det = a * A + b * B + c * C;
	return [
		A,
		c * h - b * i,
		b * f - c * e,
		B,
		a * i - c * g,
		c * d - a * f,
		C,
		b * g - a * h,
		a * e - b * d,
	].map((value) => value / det) as Matrix;
};

export const project = (m: Matrix, x: number, y: number): Point => {
	const w = m[6] * x + m[7] * y + m[8];
	return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
};

export const flatView = (width: number, height: number): View => ({
	x0: 0,
	y0: 0,
	width,
	height,
	inverse: null,
	transform: "none",
	mist: null,
	far: FAR,
	reach: Math.hypot(width, height) / 2,
});

export const viewFor = (
	tiltX: number,
	tiltY: number,
	width: number,
	height: number,
	cellSize: number,
): View => {
	if (!tiltX && !tiltY) return flatView(width, height);
	const ax = (tiltX * Math.PI) / 180;
	const ay = (tiltY * Math.PI) / 180;
	const depth = Math.max(width, height) * 1.25;
	const cx = width / 2;
	const cy = height / 2;
	const tilt: Matrix = [
		Math.cos(ay),
		0,
		0,
		Math.sin(ax) * Math.sin(ay),
		Math.cos(ax),
		0,
		(Math.sin(ay) * Math.cos(ax)) / depth,
		-Math.sin(ax) / depth,
		1,
	];
	const forward = multiply(multiply([1, 0, cx, 0, 1, cy, 0, 0, 1], tilt), [
		1,
		0,
		-cx,
		0,
		1,
		-cy,
		0,
		0,
		1,
	]);
	const inverse = invert(forward);
	const facing = Math.cos(ax) * Math.cos(ay);
	const far = clamp(Math.sqrt((facing * cellSize) / 5), 1.15, FAR);
	const near = Math.min(Math.sqrt((facing * cellSize) / 14), far - 0.35);
	const nearness = (x: number, y: number) =>
		inverse[6] * x + inverse[7] * y + inverse[8] - 1 / far;
	const corners: Point[] = [
		[0, 0],
		[width, 0],
		[width, height],
		[0, height],
	];
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	const include = (x: number, y: number) => {
		const [px, py] = project(inverse, x, y);
		x0 = Math.min(x0, px);
		y0 = Math.min(y0, py);
		x1 = Math.max(x1, px);
		y1 = Math.max(y1, py);
	};
	corners.forEach((a, k) => {
		const b = corners[(k + 1) % 4] ?? a;
		const na = nearness(a[0], a[1]);
		const nb = nearness(b[0], b[1]);
		if (na >= 0) include(a[0], a[1]);
		if (na >= 0 !== nb >= 0) {
			const t = na / (na - nb);
			include(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
		}
	});
	if (!(x1 > x0 && y1 > y0)) return flatView(width, height);
	x0 = Math.floor(x0 / 16) * 16;
	y0 = Math.floor(y0 / 16) * 16;
	x1 = Math.ceil(x1 / 16) * 16;
	y1 = Math.ceil(y1 / 16) * 16;
	const m = multiply(forward, [1, 0, x0, 0, 1, y0, 0, 0, 1]);
	const transform = `matrix3d(${[m[0], m[3], 0, m[6], m[1], m[4], 0, m[7], 0, 0, 1, 0, m[2], m[5], 0, m[8]].join(", ")})`;
	const gx = forward[6];
	const gy = forward[7];
	const slope = Math.hypot(gx, gy);
	const mist: View["mist"] =
		slope > 1e-9
			? [
					cx + (gx / slope) * ((near - 1) / slope),
					cy + (gy / slope) * ((near - 1) / slope),
					cx + (gx / slope) * ((far - 1) / slope),
					cy + (gy / slope) * ((far - 1) / slope),
				]
			: null;
	const reach = Math.max(
		Math.hypot(x0 - cx, y0 - cy),
		Math.hypot(x1 - cx, y0 - cy),
		Math.hypot(x1 - cx, y1 - cy),
		Math.hypot(x0 - cx, y1 - cy),
	);
	return {
		x0,
		y0,
		width: x1 - x0,
		height: y1 - y0,
		inverse,
		transform,
		mist,
		far,
		reach,
	};
};

export const layoutFor = (shape: string, size: number): Layout => {
	if (shape === "hexagon") {
		const radius = size / SQRT3;
		return { stepX: radius * 1.5, stepY: size, radius };
	}
	if (shape === "triangle") {
		const side = (size * 2) / SQRT3;
		return { stepX: side / 2, stepY: size, side };
	}
	return { stepX: size, stepY: size };
};

export const centerOf = (
	shape: string,
	layout: Layout,
	i: number,
	j: number,
): Point => {
	const { stepX, stepY } = layout;
	if (shape === "hexagon")
		return [i * stepX, j * stepY + (Math.abs(i) % 2 === 1 ? stepY / 2 : 0)];
	if (shape === "triangle") {
		const up = (((i + j) % 2) + 2) % 2 === 0;
		return [i * stepX, j * stepY + (up ? stepY * (2 / 3) : stepY / 3)];
	}
	if (shape === "cross" || shape === "dot") return [i * stepX, j * stepY];
	return [(i + 0.5) * stepX, (j + 0.5) * stepY];
};

export const traceCell = (
	ctx: CanvasRenderingContext2D,
	shape: string,
	layout: Layout,
	size: number,
	i: number,
	j: number,
	x: number,
	y: number,
	inset: number,
) => {
	if (shape === "hexagon") {
		const r = (layout.radius ?? 0) - inset;
		for (let k = 0; k < 6; k++) {
			const angle = (Math.PI / 3) * k;
			const px = x + r * Math.cos(angle);
			const py = y + r * Math.sin(angle);
			if (k === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
	} else if (shape === "triangle") {
		const up = (((i + j) % 2) + 2) % 2 === 0;
		const half = (layout.side ?? 0) / 2 - inset * 1.7;
		const height = size - inset * 2.6;
		const top = up ? y - height * (2 / 3) : y + height * (2 / 3);
		const base = up ? y + height / 3 : y - height / 3;
		ctx.moveTo(x, top);
		ctx.lineTo(x + half, base);
		ctx.lineTo(x - half, base);
		ctx.closePath();
	} else if (shape === "diamond") {
		const r = size / 2 - inset;
		ctx.moveTo(x, y - r);
		ctx.lineTo(x + r, y);
		ctx.lineTo(x, y + r);
		ctx.lineTo(x - r, y);
		ctx.closePath();
	} else if (shape === "circle") {
		ctx.moveTo(x + size / 2 - inset, y);
		ctx.arc(x, y, Math.max(0.5, size / 2 - inset), 0, Math.PI * 2);
	} else if (shape === "tile") {
		const half = size / 2 - Math.max(inset, size * 0.06);
		const r = Math.min(half, size * 0.22);
		ctx.roundRect(x - half, y - half, half * 2, half * 2, r);
	} else if (shape === "cross") {
		const arm = size * 0.16 + inset;
		ctx.moveTo(x - arm, y);
		ctx.lineTo(x + arm, y);
		ctx.moveTo(x, y - arm);
		ctx.lineTo(x, y + arm);
	} else if (shape === "dot") {
		const r = size * 0.05 + inset;
		ctx.moveTo(x + r, y);
		ctx.arc(x, y, r, 0, Math.PI * 2);
	} else {
		const half = size / 2 - inset;
		ctx.rect(x - half, y - half, half * 2, half * 2);
	}
};
