import { Button } from "@/shared/ui/controls";
import { WarmTooltip } from "@/shared/ui/overlays";
import { shortDay, type TrafficBucket } from "../../../model/chartData";
import {
	BOTTOM,
	TOP,
	type TrafficPlotGeometry,
	type TrafficSeries,
} from "../../../model/trafficPlotGeometry";
import styles from "./TrafficChart.module.css";

export function TrafficPoint({
	bucket,
	index,
	lastIndex,
	selected,
	unit,
	visible,
	geometry,
	setActive,
	onSelect,
}: {
	bucket: TrafficBucket;
	index: number;
	lastIndex: number;
	selected: boolean;
	unit: string;
	visible: TrafficSeries;
	geometry: TrafficPlotGeometry;
	setActive: (index: number) => void;
	onSelect: (from: string, to: string) => void;
}) {
	const { x, y } = geometry;
	return (
		<WarmTooltip
			content={
				<div className={styles.trafficHint}>
					<strong>
						{shortDay(bucket.from)}
						{bucket.from !== bucket.to && ` — ${shortDay(bucket.to)}`}
					</strong>
					<span className={styles.inbound}>
						Поставки: {bucket.inbound.toLocaleString("ru-RU")} {unit}
					</span>
					<span className={styles.outbound}>
						Отгрузки: {bucket.outbound.toLocaleString("ru-RU")} {unit}
					</span>
				</div>
			}
		>
			<Button
				render={<g />}
				variant="ghost"
				tooltip={false}
				role="button"
				tabIndex={selected ? 0 : -1}
				aria-label={`${shortDay(bucket.from)}: поставки ${bucket.inbound}, отгрузки ${bucket.outbound}. Показать операции.`}
				data-point-index={index}
				className={styles.chartPoint}
				onPointerEnter={() => setActive(index)}
				onFocus={() => setActive(index)}
				onClick={() => onSelect(bucket.from, bucket.to)}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onSelect(bucket.from, bucket.to);
					}
					const next =
						event.key === "ArrowRight"
							? Math.min(lastIndex, index + 1)
							: event.key === "ArrowLeft"
								? Math.max(0, index - 1)
								: event.key === "Home"
									? 0
									: event.key === "End"
										? lastIndex
										: null;
					if (next !== null) {
						event.preventDefault();
						setActive(next);
						event.currentTarget.parentElement
							?.querySelector<SVGElement>(`[data-point-index="${next}"]`)
							?.focus();
					}
				}}
			>
				<rect
					x={geometry.pointLeft(index)}
					y={TOP}
					width={geometry.pointWidth}
					height={BOTTOM - TOP}
					fill="transparent"
				/>
				{visible.inbound && (
					<circle
						cx={x(index)}
						cy={y(bucket.inbound)}
						r={selected ? 5 : 2.5}
						fill="var(--primary)"
						stroke="var(--card)"
						strokeWidth="2"
					/>
				)}
				{visible.outbound && (
					<circle
						cx={x(index)}
						cy={y(bucket.outbound)}
						r={selected ? 5 : 2.5}
						fill="var(--info)"
						stroke="var(--card)"
						strokeWidth="2"
					/>
				)}
			</Button>
		</WarmTooltip>
	);
}
