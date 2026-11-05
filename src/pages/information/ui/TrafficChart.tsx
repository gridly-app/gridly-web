import { useState } from "react";
import {
	Badge,
	Button,
	Empty,
	EmptyDescription,
	ScrollArea,
	SegmentedControl,
	WarmTooltip,
} from "@/shared/ui";
import {
	shortDay,
	trafficBuckets,
	type WarehouseReport,
} from "../model/chartData";
import { previousPeriod, type ReportFilters } from "../model/report";
import styles from "./InformationPage.module.css";

interface Props {
	report: WarehouseReport;
	previous: WarehouseReport | null;
	filters: ReportFilters;
	timezone: string;
	onSelect: (from: string, to: string) => void;
}
const LEFT = 52,
	RIGHT = 780,
	TOP = 20,
	BOTTOM = 224;
export function TrafficChart({
	report,
	previous,
	filters,
	timezone,
	onSelect,
}: Props) {
	const [metric, setMetric] = useState<"quantity" | "orders">("quantity");
	const [granularity, setGranularity] = useState<"day" | "week">("day");
	const [visible, setVisible] = useState({ inbound: true, outbound: true });
	const [active, setActive] = useState<number | null>(null);
	const buckets = trafficBuckets(
		report.orders,
		filters,
		metric,
		granularity,
		timezone,
	);
	const preceding = previous
		? trafficBuckets(
				previous.orders,
				previousPeriod(filters),
				metric,
				granularity,
				timezone,
			)
		: [];
	const maximum = Math.max(
		1,
		...buckets.flatMap((bucket) => [
			visible.inbound ? bucket.inbound : 0,
			visible.outbound ? bucket.outbound : 0,
		]),
		...preceding.flatMap((bucket) => [
			visible.inbound ? bucket.inbound : 0,
			visible.outbound ? bucket.outbound : 0,
		]),
	);
	const ceiling = Math.ceil(maximum / 4) * 4;
	const x = (index: number) =>
		buckets.length === 1
			? (LEFT + RIGHT) / 2
			: LEFT + (index / (buckets.length - 1)) * (RIGHT - LEFT);
	const y = (value: number) => BOTTOM - (value / ceiling) * (BOTTOM - TOP);
	const line = (data: typeof buckets, kind: "inbound" | "outbound") =>
		data
			.map(
				(bucket, index) =>
					`${index ? "L" : "M"} ${x(index)} ${y(bucket[kind])}`,
			)
			.join(" ");
	const activeIndex = Math.min(
		active ?? buckets.length - 1,
		buckets.length - 1,
	);
	const selected = active === null ? undefined : buckets[activeIndex];
	const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));
	const unit = metric === "quantity" ? "шт." : "заказов";
	const toggle = (kind: "inbound" | "outbound") =>
		setVisible((current) =>
			current[kind] &&
			!(kind === "inbound" ? current.outbound : current.inbound)
				? current
				: { ...current, [kind]: !current[kind] },
		);
	return (
		<section
			className={styles.chartCard}
			aria-label="Динамика поставок и отгрузок"
		>
			<div className={styles.chartHeading}>
				<div>
					<h3>Поставки и отгрузки</h3>
				</div>
				<SegmentedControl
					aria-label="Единицы графика"
					value={metric}
					onValueChange={setMetric}
					items={[
						{ value: "quantity", label: "Штуки" },
						{ value: "orders", label: "Заказы" },
					]}
				/>
			</div>
			<div className={styles.chartControls}>
				<div className={styles.legend}>
					{(["inbound", "outbound"] as const).map((kind) => (
						<Button
							key={kind}
							variant="ghost"
							size="sm"
							selected={visible[kind]}
							onClick={() => toggle(kind)}
							className={styles.legendButton}
							data-series={kind}
						>
							<span
								className={styles.dot}
								style={{
									background:
										kind === "inbound" ? "var(--primary)" : "var(--info)",
								}}
							/>
							{kind === "inbound" ? "Поставки" : "Отгрузки"}
						</Button>
					))}
					{previous && (
						<Badge tone="neutral">Пунктир — предыдущий период</Badge>
					)}
				</div>
				<SegmentedControl
					aria-label="Группировка графика"
					value={granularity}
					onValueChange={setGranularity}
					items={[
						{ value: "day", label: "Дни" },
						{ value: "week", label: "Недели" },
					]}
				/>
			</div>
			{!report.orders.length ? (
				<Empty>
					<EmptyDescription>Нет операций за выбранный период.</EmptyDescription>
				</Empty>
			) : (
				<>
					<ScrollArea
						className={styles.trafficPlot}
						clampContentMinWidth={false}
					>
						<svg
							viewBox="0 0 800 264"
							onPointerLeave={() => setActive(null)}
							onBlur={(event) => {
								if (
									!event.currentTarget.contains(
										event.relatedTarget as Node | null,
									)
								)
									setActive(null);
							}}
							role="application"
							aria-label={`Поставки и отгрузки с ${filters.from} по ${filters.to}, ${unit}`}
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
											color:
												kind === "inbound" ? "var(--primary)" : "var(--info)",
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
								<WarmTooltip
									key={bucket.from}
									content={
										<div className={styles.trafficHint}>
											<strong>
												{shortDay(bucket.from)}
												{bucket.from !== bucket.to &&
													` — ${shortDay(bucket.to)}`}
											</strong>
											<span className={styles.inbound}>
												Поставки: {bucket.inbound.toLocaleString("ru-RU")}{" "}
												{unit}
											</span>
											<span className={styles.outbound}>
												Отгрузки: {bucket.outbound.toLocaleString("ru-RU")}{" "}
												{unit}
											</span>
										</div>
									}
								>
									<Button
										render={<g />}
										variant="ghost"
										tooltip={false}
										role="button"
										tabIndex={index === activeIndex ? 0 : -1}
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
													? Math.min(buckets.length - 1, index + 1)
													: event.key === "ArrowLeft"
														? Math.max(0, index - 1)
														: event.key === "Home"
															? 0
															: event.key === "End"
																? buckets.length - 1
																: null;
											if (next !== null) {
												event.preventDefault();
												setActive(next);
												event.currentTarget.parentElement
													?.querySelector<SVGElement>(
														`[data-point-index="${next}"]`,
													)
													?.focus();
											}
										}}
									>
										<rect
											x={Math.max(
												LEFT,
												x(index) -
													Math.max(
														8,
														(RIGHT - LEFT) /
															Math.max(1, buckets.length - 1) /
															2,
													),
											)}
											y={TOP}
											width={Math.min(
												RIGHT - LEFT,
												Math.max(
													16,
													(RIGHT - LEFT) / Math.max(1, buckets.length - 1),
												),
											)}
											height={BOTTOM - TOP}
											fill="transparent"
										/>
										{visible.inbound && (
											<circle
												cx={x(index)}
												cy={y(bucket.inbound)}
												r={index === activeIndex ? 5 : 2.5}
												fill="var(--primary)"
												stroke="var(--card)"
												strokeWidth="2"
											/>
										)}
										{visible.outbound && (
											<circle
												cx={x(index)}
												cy={y(bucket.outbound)}
												r={index === activeIndex ? 5 : 2.5}
												fill="var(--info)"
												stroke="var(--card)"
												strokeWidth="2"
											/>
										)}
									</Button>
								</WarmTooltip>
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
					{buckets.some((bucket) => bucket.from !== bucket.to) && (
						<p className={styles.chartNote}>
							Данные объединены в интервалы. Выбор точки показывает весь
							интервал.
						</p>
					)}
				</>
			)}
		</section>
	);
}
