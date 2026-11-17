import { ScrollArea } from "@/shared/ui/navigation";
import { shortDay, type TrafficBucket } from "../../../model/chartData";
import {
	BOTTOM,
	LEFT,
	RIGHT,
	TOP,
	type TrafficSeries,
	trafficPlotGeometry,
} from "../../../model/trafficPlotGeometry";
import styles from "./TrafficChart.module.css";
import { TrafficPoint } from "./TrafficPoint";

export function TrafficPlot({
	buckets,
	preceding,
	visible,
	active,
	setActive,
	onSelect,
	label,
	unit,
}: {
	buckets: TrafficBucket[];
	preceding: TrafficBucket[];
	visible: TrafficSeries;
	active: number | null;
	setActive: (index: number | null) => void;
	onSelect: (from: string, to: string) => void;
	label: string;
	unit: string;
}) {
	const geometry = trafficPlotGeometry(buckets, preceding, visible);
	const { ceiling, x, y, line } = geometry;
	const activeIndex = Math.min(
		active ?? buckets.length - 1,
		buckets.length - 1,
	);
	const selected = active === null ? undefined : buckets[activeIndex];
	const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));
	return (
		<ScrollArea className={styles.trafficPlot} clampContentMinWidth={false}>
			<svg
				viewBox="0 0 800 264"
				onPointerLeave={() => setActive(null)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null))
						setActive(null);
				}}
				role="application"
				aria-label={label}
			>
				<desc>
					Поставки и отгрузки. Стрелки переключают точки, Enter открывает
					операции.
				</desc>
				{[0, 1, 2, 3, 4].map((tick) => (
					<g key={tick}>
						<line
							x1={LEFT}
							x2={RIGHT}
							y1={y((ceiling * tick) / 4)}
							y2={y((ceiling * tick) / 4)}
							className={styles.gridLine}
						/>
						<text
							x={LEFT - 12}
							y={y((ceiling * tick) / 4) + 4}
							textAnchor="end"
							className={styles.axisLabel}
						>
							{Math.round((ceiling * tick) / 4)}
						</text>
					</g>
				))}
				{(["inbound", "outbound"] as const)
					.filter((kind) => visible[kind])
					.map((kind) => (
						<g
							key={kind}
							style={{
								color: kind === "inbound" ? "var(--primary)" : "var(--info)",
							}}
						>
							<path
								d={`${line(buckets, kind)} L ${x(buckets.length - 1)} ${BOTTOM} L ${x(0)} ${BOTTOM} Z`}
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
				{selected && (
					<line
						x1={x(activeIndex)}
						x2={x(activeIndex)}
						y1={TOP}
						y2={BOTTOM}
						className={styles.crosshair}
					/>
				)}
				{buckets.map((bucket, index) => (
					<TrafficPoint
						key={bucket.from}
						bucket={bucket}
						index={index}
						lastIndex={buckets.length - 1}
						selected={index === activeIndex}
						unit={unit}
						visible={visible}
						geometry={geometry}
						setActive={setActive}
						onSelect={onSelect}
					/>
				))}
				{buckets
					.filter(
						(_, index) =>
							index % tickEvery === 0 || index === buckets.length - 1,
					)
					.map((bucket) => (
						<text
							key={bucket.from}
							x={x(buckets.indexOf(bucket))}
							y="252"
							textAnchor="middle"
							className={styles.axisLabel}
						>
							{shortDay(bucket.from)}
						</text>
					))}
			</svg>
		</ScrollArea>
	);
}
