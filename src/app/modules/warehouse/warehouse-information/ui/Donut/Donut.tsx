import type { KeyboardEvent } from "react";

import { Button } from "@/shared/ui/controls";

import { formatNumber } from "../../lib/formatNumber";

import chartStyles from "../../shared.module.css";
import styles from "./Donut.module.css";

interface Slice {
	key: string;
	label: string;
	value: number;
	color: string;
}

const center = 100;
const radius = 72;
const strokeWidth = 22;
const selectedStrokeWidth = 27;
const sliceGap = 3;
const dimmedOpacity = 0.25;
const circumference = 2 * Math.PI * radius;

function sliceArcs(slices: Slice[]) {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	let offset = 0;

	return slices
		.filter((slice) => slice.value > 0)
		.map((slice) => {
			const length = total ? (slice.value / total) * circumference : 0;
			const arc = { slice, length, offset };

			offset += length;

			return arc;
		});
}

export function Donut({
	slices,
	selected,
	title,
	total,
	caption,
	onSelect,
}: {
	slices: Slice[];
	selected: string;
	title: string;
	total: number;
	caption: string;
	onSelect: (key: string) => void;
}) {
	function opacityOf(key: string) {
		return selected === "all" || selected === key ? 1 : dimmedOpacity;
	}

	function handleSliceKeyDown(event: KeyboardEvent, key: string) {
		if (event.key !== "Enter" && event.key !== " ") return;

		event.preventDefault();
		onSelect(key);
	}

	return (
		<div className={styles.distribution}>
			<svg
				viewBox="0 0 200 200"
				role="application"
				aria-label={title}
				className={styles.donut}
			>
				<desc>{title}</desc>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke="var(--muted)"
					strokeWidth={strokeWidth}
				/>
				{sliceArcs(slices).map(({ slice, length, offset }) => {
					const visibleLength = Math.max(
						0,
						length - (length < circumference ? sliceGap : 0),
					);

					return (
						<Button
							render={<g />}
							variant="ghost"
							tooltip={`${slice.label}: ${formatNumber(slice.value)}`}
							key={slice.key}
							role="button"
							tabIndex={0}
							className={styles.donutSlice}
							aria-label={`${slice.label}: ${slice.value}. Выбрать.`}
							onClick={() => onSelect(slice.key)}
							onKeyDown={(event) => handleSliceKeyDown(event, slice.key)}
						>
							<circle
								cx={center}
								cy={center}
								r={radius}
								fill="none"
								stroke={slice.color}
								strokeWidth={
									selected === slice.key ? selectedStrokeWidth : strokeWidth
								}
								strokeDasharray={`${visibleLength} ${circumference}`}
								strokeDashoffset={-offset}
								transform={`rotate(-90 ${center} ${center})`}
								opacity={opacityOf(slice.key)}
							/>
						</Button>
					);
				})}
				<text
					x={center}
					y="99"
					textAnchor="middle"
					className={styles.donutValue}
				>
					{formatNumber(total)}
				</text>
				<text
					x={center}
					y="122"
					textAnchor="middle"
					className={styles.donutCaption}
				>
					{caption}
				</text>
			</svg>
			<div className={styles.distributionLegend}>
				{slices.map((slice) => (
					<Button
						key={slice.key}
						variant="ghost"
						size="sm"
						selected={selected === slice.key}
						onClick={() => onSelect(slice.key)}
						className={styles.distributionItem}
					>
						<span
							className={chartStyles.dot}
							style={{ background: slice.color }}
						/>
						<span className={styles.sliceLabel}>{slice.label}</span>
						<strong>{formatNumber(slice.value)}</strong>
					</Button>
				))}
			</div>
		</div>
	);
}
