import type { FocusEvent } from "react";

import { ScrollArea } from "@/shared/ui/navigation";

import type { TrafficBucket } from "../../model/chartData";
import { formatShortDay } from "../../model/reportPeriod";
import {
	axisLabelY,
	gridSteps,
	plotBounds,
	plotViewBox,
	type TrafficSeries,
	trafficPlotGeometry,
} from "../../model/trafficPlotGeometry";
import { TrafficPoint } from "../TrafficPoint/TrafficPoint";

import styles from "../../shared.module.css";

const seriesKinds = ["inbound", "outbound"] as const;
const seriesColors = { inbound: "var(--primary)", outbound: "var(--info)" };
const maxAxisLabels = 6;
const axisLabelOffset = 12;
const gridTicks = Array.from({ length: gridSteps + 1 }, (_, index) => index);

export function TrafficPlot({
	buckets,
	preceding,
	visible,
	activeIndex,
	label,
	unit,
	onActiveChange,
	onSelect,
}: {
	buckets: TrafficBucket[];
	preceding: TrafficBucket[];
	visible: TrafficSeries;
	activeIndex: number | null;
	label: string;
	unit: string;
	onActiveChange: (index: number | null) => void;
	onSelect: (from: string, to: string) => void;
}) {
	const geometry = trafficPlotGeometry(buckets, preceding, visible);
	const { ceiling, x, y, line } = geometry;
	const { left, right, top, bottom } = plotBounds;
	const lastIndex = buckets.length - 1;
	const focusedIndex = Math.min(activeIndex ?? lastIndex, lastIndex);
	const isActive = activeIndex !== null && buckets[focusedIndex] !== undefined;
	const labelEvery = Math.max(1, Math.ceil(buckets.length / maxAxisLabels));
	const axisBuckets = buckets
		.map((bucket, index) => ({ bucket, index }))
		.filter(({ index }) => index % labelEvery === 0 || index === lastIndex);
	const visibleKinds = seriesKinds.filter((kind) => visible[kind]);

	function handlePointerLeave() {
		onActiveChange(null);
	}

	function handleBlur(event: FocusEvent<SVGSVGElement>) {
		const nextTarget = event.relatedTarget;

		if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget))
			return;

		onActiveChange(null);
	}

	return (
		<ScrollArea className={styles.trafficPlot} clampContentMinWidth={false}>
			<svg
				viewBox={`0 0 ${plotViewBox.width} ${plotViewBox.height}`}
				onPointerLeave={handlePointerLeave}
				onBlur={handleBlur}
				role="application"
				aria-label={label}
			>
				<desc>
					Поставки и отгрузки. Стрелки переключают точки, Enter открывает
					операции.
				</desc>
				{gridTicks.map((tick) => {
					const value = (ceiling * tick) / gridSteps;

					return (
						<g key={tick}>
							<line
								x1={left}
								x2={right}
								y1={y(value)}
								y2={y(value)}
								className={styles.gridLine}
							/>
							<text
								x={left - axisLabelOffset}
								y={y(value) + 4}
								textAnchor="end"
								className={styles.axisLabel}
							>
								{Math.round(value)}
							</text>
						</g>
					);
				})}
				{visibleKinds.map((kind) => (
					<g key={kind} style={{ color: seriesColors[kind] }}>
						<path
							d={`${line(buckets, kind)} L ${x(lastIndex)} ${bottom} L ${x(0)} ${bottom} Z`}
							fill="currentColor"
							opacity="0.07"
						/>
						{preceding.length > 0 && (
							<path
								d={line(preceding, kind)}
								stroke="currentColor"
								strokeWidth="2"
								strokeDasharray="6 5"
								opacity="0.4"
								fill="none"
							/>
						)}
						<path
							d={line(buckets, kind)}
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="none"
						/>
					</g>
				))}
				{isActive && (
					<line
						x1={x(focusedIndex)}
						x2={x(focusedIndex)}
						y1={top}
						y2={bottom}
						className={styles.crosshair}
					/>
				)}
				{buckets.map((bucket, index) => (
					<TrafficPoint
						key={bucket.from}
						bucket={bucket}
						index={index}
						lastIndex={lastIndex}
						isSelected={index === focusedIndex}
						unit={unit}
						visible={visible}
						geometry={geometry}
						onActiveChange={onActiveChange}
						onSelect={onSelect}
					/>
				))}
				{axisBuckets.map(({ bucket, index }) => (
					<text
						key={bucket.from}
						x={x(index)}
						y={axisLabelY}
						textAnchor="middle"
						className={styles.axisLabel}
					>
						{formatShortDay(bucket.from)}
					</text>
				))}
			</svg>
		</ScrollArea>
	);
}
