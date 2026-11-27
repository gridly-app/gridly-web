import { useState } from "react";

import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";

import {
	type TrafficGranularity,
	type TrafficMetric,
	trafficBuckets,
} from "../../model/chartData";
import type { WarehouseReport } from "../../model/report";
import { previousPeriod, type ReportFilters } from "../../model/reportPeriod";
import type { TrafficSeries } from "../../model/trafficPlotGeometry";
import { TrafficPlot } from "../TrafficPlot/TrafficPlot";

import chartStyles from "../../shared.module.css";

type SeriesKind = keyof TrafficSeries;

const seriesKinds = ["inbound", "outbound"] as const;
const seriesLabels = { inbound: "Поставки", outbound: "Отгрузки" };
const seriesColors = { inbound: "var(--primary)", outbound: "var(--info)" };
const metricItems = [
	{ value: "quantity", label: "Штуки" },
	{ value: "orders", label: "Заказы" },
] as const;
const granularityItems = [
	{ value: "day", label: "Дни" },
	{ value: "week", label: "Недели" },
] as const;

function toggleSeries(current: TrafficSeries, kind: SeriesKind): TrafficSeries {
	const otherKind = kind === "inbound" ? "outbound" : "inbound";
	const isLastVisible = current[kind] && !current[otherKind];

	return isLastVisible ? current : { ...current, [kind]: !current[kind] };
}

export function TrafficChart({
	report,
	previous,
	filters,
	timezone,
	onSelect,
}: {
	report: WarehouseReport;
	previous: WarehouseReport | null;
	filters: ReportFilters;
	timezone: string;
	onSelect: (from: string, to: string) => void;
}) {
	const [metric, setMetric] = useState<TrafficMetric>("quantity");
	const [granularity, setGranularity] = useState<TrafficGranularity>("day");
	const [visible, setVisible] = useState<TrafficSeries>({
		inbound: true,
		outbound: true,
	});
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
	const unit = metric === "quantity" ? "шт." : "заказов";
	const hasIntervals = buckets.some((bucket) => bucket.from !== bucket.to);

	function handleToggle(kind: SeriesKind) {
		setVisible((current) => toggleSeries(current, kind));
	}

	return (
		<section
			className={chartStyles.chartCard}
			aria-label="Динамика поставок и отгрузок"
		>
			<div className={chartStyles.chartHeading}>
				<h3>Поставки и отгрузки</h3>
				<SegmentedControl
					aria-label="Единицы графика"
					value={metric}
					onValueChange={setMetric}
					items={metricItems}
				/>
			</div>
			<div className={chartStyles.chartControls}>
				<div className={chartStyles.legend}>
					{seriesKinds.map((kind) => (
						<Button
							key={kind}
							variant="ghost"
							size="sm"
							selected={visible[kind]}
							onClick={() => handleToggle(kind)}
							className={chartStyles.legendButton}
							data-series={kind}
						>
							<span
								className={chartStyles.dot}
								style={{ background: seriesColors[kind] }}
							/>
							{seriesLabels[kind]}
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
					items={granularityItems}
				/>
			</div>
			{report.orders.length ? (
				<>
					<TrafficPlot
						buckets={buckets}
						preceding={preceding}
						visible={visible}
						activeIndex={activeIndex}
						label={`Поставки и отгрузки с ${filters.from} по ${filters.to}, ${unit}`}
						unit={unit}
						onActiveChange={setActiveIndex}
						onSelect={onSelect}
					/>
					{hasIntervals && (
						<p className={chartStyles.chartNote}>
							Данные объединены в интервалы. Выбор точки показывает весь
							интервал.
						</p>
					)}
				</>
			) : (
				<Empty>
					<EmptyDescription>Нет операций за выбранный период.</EmptyDescription>
				</Empty>
			)}
		</section>
	);
}
