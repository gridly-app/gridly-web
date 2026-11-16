// Adapted from React Bits Shape Grid. License: docs/react-bits-LICENSE.md.
// https://github.com/DavidHDev/react-bits
"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import styles from "./ShapeGrid.module.css";
import {
	type ShapeGridColors,
	smootherstep,
	startShapeGrid,
} from "./shapeGridEngine";

function fadeMask() {
	const edge = 0.8 * 26;
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
}

const mask = fadeMask();

export default function ShapeGrid({ lineColor, hoverColor }: ShapeGridColors) {
	const reducedMotion = useReducedMotion();
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<ReturnType<typeof startShapeGrid>>(undefined);
	const colors = { lineColor, hoverColor };
	const colorsRef = useRef(colors);

	colorsRef.current = colors;

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const engine = startShapeGrid(
			container,
			canvas,
			() => colorsRef.current,
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

	return (
		<div
			ref={containerRef}
			className={styles.grid}
			style={{
				maskImage: mask,
				WebkitMaskImage: mask,
				maskComposite: "intersect",
				WebkitMaskComposite: "source-in",
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
