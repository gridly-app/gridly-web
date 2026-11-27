import { useState } from "react";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";
import { trafficBuckets } from "../../model/chartData";
import { type WarehouseReport } from "../../model/report";
import { previousPeriod, type ReportFilters } from "../../model/reportPeriod";
import chartStyles from "../../shared.module.css";
import { TrafficPlot } from "../TrafficPlot/TrafficPlot";

interface Props {
	report: WarehouseReport;
	previous: WarehouseReport | null;
	filters: ReportFilters;
	timezone: string;
	onSelect: (from: string, to: string) => void;
}
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
			className={chartStyles.chartCard}
			aria-label="Динамика поставок и отгрузок"
		>
			<div className={chartStyles.chartHeading}>
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
			<div className={chartStyles.chartControls}>
				<div className={chartStyles.legend}>
					{(["inbound", "outbound"] as const).map((kind) => (
						<Button
							key={kind}
							variant="ghost"
							size="sm"
							selected={visible[kind]}
							onClick={() => toggle(kind)}
							className={chartStyles.legendButton}
							data-series={kind}
						>
							<span
								className={chartStyles.dot}
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
					<TrafficPlot
						buckets={buckets}
						preceding={preceding}
						visible={visible}
						active={active}
						setActive={setActive}
						onSelect={onSelect}
						label={`Поставки и отгрузки с ${filters.from} по ${filters.to}, ${unit}`}
						unit={unit}
					/>
					{buckets.some((bucket) => bucket.from !== bucket.to) && (
						<p className={chartStyles.chartNote}>
							Данные объединены в интервалы. Выбор точки показывает весь
							интервал.
						</p>
					)}
				</>
			)}
		</section>
	);
}
