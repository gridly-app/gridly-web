// Adapted from React Bits Shape Grid. License: docs/react-bits-LICENSE.md.
// https://github.com/DavidHDev/react-bits
"use client";

import { useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";
import styles from "./ShapeGrid.module.css";
import {
	DIRECTIONS,
	type ShapeGridSettings,
	smootherstep,
	startShapeGrid,
} from "./shapeGridEngine";
import { clamp } from "./shapeGridGeometry";

export interface ShapeGridProps {
	shape?:
		| "square"
		| "tile"
		| "hexagon"
		| "triangle"
		| "diamond"
		| "circle"
		| "cross"
		| "dot";
	cellSize?: number;
	lineWidth?: number;
	direction?: "diagonal" | "up" | "down" | "left" | "right" | "none";
	speed?: number;
	lineColor?: string;
	hoverColor?: string;
	hoverFillColor?: string;
	fillOpacity?: number;
	rainbow?: boolean;
	tiltX?: number;
	tiltY?: number;
	radius?: number;
	trail?: number;
	glow?: number;
	twinkle?: number;
	fade?: number;
	clickCascade?: boolean;
	intro?: boolean;
	opacity?: number;
	backgroundColor?: string;
	paused?: boolean;
	dpr?: number | undefined;
	className?: string;
	style?: CSSProperties;
}

const SHAPES = [
	"square",
	"tile",
	"hexagon",
	"triangle",
	"diamond",
	"circle",
	"cross",
	"dot",
];

const fadeMask = (amount: number) => {
	if (amount <= 0) return "none";
	const edge = amount * 26;
	const stops: string[] = [];
	for (let k = 0; k <= 8; k++) {
		const t = k / 8;
		stops.push(
			`rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) ${(t * edge).toFixed(2)}%`,
		);
	}
	const inner = stops.join(", ");
	const outer = [...stops]
		.reverse()
		.map((stop) =>
			stop.replace(
				/ ([\d.]+)%$/,
				(_: string, value: string) =>
					` ${(100 - parseFloat(value)).toFixed(2)}%`,
			),
		)
		.join(", ");
	const axis = (direction: string) =>
		`linear-gradient(${direction}, ${inner}, ${outer})`;
	return `${axis("to right")}, ${axis("to bottom")}`;
};

const lightnessOf = (color: string) => {
	let hex = String(color).trim().replace(/^#/, "");
	if (hex.length === 3 || hex.length === 4) hex = hex.replace(/./g, "$&$&");
	hex = hex.slice(0, 6);
	if (!/^[0-9a-f]{6}$/i.test(hex)) return 0.6;
	const value = parseInt(hex, 16);
	const channels = [value >> 16, (value >> 8) & 255, value & 255];
	return (Math.max(...channels) + Math.min(...channels)) / 510;
};

export default function ShapeGrid({
	shape = "square",
	cellSize = 40,
	lineWidth = 1,
	direction = "diagonal",
	speed = 0.5,
	lineColor = "#2a2734",
	hoverColor = "#ffffff",
	hoverFillColor,
	fillOpacity = 0.15,
	rainbow = false,
	tiltX = 0,
	tiltY = 0,
	radius = 1.5,
	trail = 0.6,
	glow = 0.35,
	twinkle = 0,
	fade = 1,
	clickCascade = true,
	intro = true,
	opacity = 1,
	backgroundColor = "transparent",
	paused = false,
	dpr,
	className = "",
	style,
}: ShapeGridProps) {
	const reducedMotion = useReducedMotion();
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<ReturnType<typeof startShapeGrid>>(undefined);
	const settingsRef = useRef<ShapeGridSettings>(
		null as unknown as ShapeGridSettings,
	);

	settingsRef.current = {
		shape: SHAPES.includes(shape) ? shape : "square",
		cellSize: Math.max(8, cellSize),
		lineWidth: Math.max(0.25, lineWidth),
		direction: DIRECTIONS[direction] ? direction : "diagonal",
		speed: Math.max(0, speed),
		lineColor,
		hoverColor,
		hoverFillColor: hoverFillColor ?? hoverColor,
		fillOpacity: clamp(fillOpacity, 0, 1),
		rainbow,
		tone: clamp(lightnessOf(hoverColor), 0.45, 0.68),
		tiltX: clamp(tiltX, -70, 70),
		tiltY: clamp(tiltY, -70, 70),
		radius: Math.max(0, radius),
		trail: Math.max(0.05, trail),
		glow: clamp(glow, 0, 1),
		twinkle: clamp(twinkle, 0, 1),
		clickCascade,
		intro,
		paused,
		dpr,
	};

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const engine = startShapeGrid(
			container,
			canvas,
			() => settingsRef.current,
			reducedMotion ?? false,
		);
		if (!engine) return;
		engineRef.current = engine;

		return () => {
			engine.stop();
			engineRef.current = undefined;
		};
	}, [reducedMotion]);

	useEffect(() => {
		engineRef.current?.redraw();
	});

	const mask = fadeMask(clamp(fade, 0, 1));

	return (
		<div
			ref={containerRef}
			className={`${styles.grid} ${className}`.trim()}
			style={{
				opacity: clamp(opacity, 0, 1),
				backgroundColor,
				...(mask === "none"
					? null
					: {
							maskImage: mask,
							WebkitMaskImage: mask,
							maskComposite: "intersect",
							WebkitMaskComposite: "source-in",
						}),
				...style,
			}}
		>
			<canvas
				ref={canvasRef}
				className={styles.canvas}
				data-slot="shape-grid-canvas"
			/>
		</div>
	);
}
