import type { KeyboardEvent } from "react";

import { Button } from "@/shared/ui/controls";
import { WarmTooltip } from "@/shared/ui/overlays";

import { formatNumber } from "../../lib/formatNumber";
import type { TrafficBucket } from "../../model/chartData";
import { formatRange, formatShortDay } from "../../model/reportPeriod";
import {
	plotBounds,
	type TrafficPlotGeometry,
	type TrafficSeries,
} from "../../model/trafficPlotGeometry";

import styles from "../../shared.module.css";

const pointRadius = 2.5;
const selectedPointRadius = 5;

function nextPointIndex(key: string, index: number, lastIndex: number) {
	const targets: Record<string, number> = {
		ArrowRight: Math.min(lastIndex, index + 1),
		ArrowLeft: Math.max(0, index - 1),
		Home: 0,
		End: lastIndex,
	};

	return targets[key];
}

export function TrafficPoint({
	bucket,
	index,
	lastIndex,
	isSelected,
	unit,
	visible,
	geometry,
	onActiveChange,
	onSelect,
}: {
	bucket: TrafficBucket;
	index: number;
	lastIndex: number;
	isSelected: boolean;
	unit: string;
	visible: TrafficSeries;
	geometry: TrafficPlotGeometry;
	onActiveChange: (index: number) => void;
	onSelect: (from: string, to: string) => void;
}) {
	const { x, y } = geometry;
	const { top, bottom } = plotBounds;
	const radius = isSelected ? selectedPointRadius : pointRadius;
	const label = `${formatShortDay(bucket.from)}: поставки ${bucket.inbound}, отгрузки ${bucket.outbound}. Показать операции.`;

	function handleActivate() {
		onActiveChange(index);
	}

	function handleSelect() {
		onSelect(bucket.from, bucket.to);
	}

	function handleKeyDown(event: KeyboardEvent<Element>) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleSelect();

			return;
		}

		const next = nextPointIndex(event.key, index, lastIndex);

		if (next === undefined) return;

		event.preventDefault();
		onActiveChange(next);
		event.currentTarget.parentElement
			?.querySelector<SVGElement>(`[data-point-index="${next}"]`)
			?.focus();
	}

	const hint = (
		<div className={styles.trafficHint}>
			<strong>{formatRange(bucket)}</strong>
			<span className={styles.inbound}>
				Поставки: {formatNumber(bucket.inbound)} {unit}
			</span>
			<span className={styles.outbound}>
				Отгрузки: {formatNumber(bucket.outbound)} {unit}
			</span>
		</div>
	);

	return (
		<WarmTooltip content={hint}>
			<Button
				render={<g />}
				variant="ghost"
				tooltip={false}
				role="button"
				tabIndex={isSelected ? 0 : -1}
				aria-label={label}
				data-point-index={index}
				className={styles.chartPoint}
				onPointerEnter={handleActivate}
				onFocus={handleActivate}
				onClick={handleSelect}
				onKeyDown={handleKeyDown}
			>
				<rect
					x={geometry.pointLeft(index)}
					y={top}
					width={geometry.pointWidth}
					height={bottom - top}
					fill="transparent"
				/>
				{visible.inbound && (
					<circle
						cx={x(index)}
						cy={y(bucket.inbound)}
						r={radius}
						fill="var(--primary)"
						stroke="var(--card)"
						strokeWidth="2"
					/>
				)}
				{visible.outbound && (
					<circle
						cx={x(index)}
						cy={y(bucket.outbound)}
						r={radius}
						fill="var(--info)"
						stroke="var(--card)"
						strokeWidth="2"
					/>
				)}
			</Button>
		</WarmTooltip>
	);
}
