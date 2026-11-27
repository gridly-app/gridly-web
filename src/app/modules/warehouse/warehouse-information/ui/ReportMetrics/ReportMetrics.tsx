import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconBox,
	IconClipboardList,
	IconInfoCircle,
} from "@tabler/icons-react";

import { Card } from "@/shared/ui/dataDisplay";
import { WarmTooltip } from "@/shared/ui/overlays";

import { formatNumber } from "../../lib/formatNumber";
import type { WarehouseReport } from "../../model/report";

import styles from "./ReportMetrics.module.css";

type MetricKey = "orders" | "inbound" | "outbound" | "stock";

type SummaryMetric = {
	key: MetricKey;
	label: string;
	value: number;
	before: number | undefined;
	Icon: typeof IconBox;
	hint: string;
};

function orderedQuantity(totals: WarehouseReport["inbound"]) {
	return totals.known + totals.unknown;
}

function summaryMetrics(
	report: WarehouseReport,
	previous: WarehouseReport | null,
): SummaryMetric[] {
	return [
		{
			key: "orders",
			label: "Заказы",
			value: report.orders.length,
			before: previous?.orders.length,
			Icon: IconClipboardList,
			hint: "Заказы по дате создания с учётом периода, направления, статуса и категории отчёта.",
		},
		{
			key: "inbound",
			label: "Поставки",
			value: orderedQuantity(report.inbound),
			before: previous ? orderedQuantity(previous.inbound) : undefined,
			Icon: IconArrowDownLeft,
			hint: "Количество товаров в заказах на поставку за выбранный период. Это состав заказов, а не фактически размещённые остатки.",
		},
		{
			key: "outbound",
			label: "Отгрузки",
			value: orderedQuantity(report.outbound),
			before: previous ? orderedQuantity(previous.outbound) : undefined,
			Icon: IconArrowUpRight,
			hint: "Количество товаров в заказах на отгрузку за выбранный период с учётом фильтров отчёта.",
		},
		{
			key: "stock",
			label: "На складе",
			value: report.stockQuantity,
			before: undefined,
			Icon: IconBox,
			hint: "Фактические остатки сейчас, включая резерв. Ожидаемые поступления сюда не входят. Учитывается категория, период не применяется.",
		},
	];
}

export function ReportMetrics({
	report,
	previous,
}: {
	report: WarehouseReport;
	previous: WarehouseReport | null;
}) {
	return (
		<Card
			render={<section />}
			className={styles.summary}
			aria-label="Основные показатели склада"
		>
			{summaryMetrics(report, previous).map(
				({ key, label, value, before, Icon, hint }) => (
					<div key={key} className={styles.summaryMetric} data-metric={key}>
						<div className={styles.metricTop}>
							<Icon size={18} aria-hidden="true" />
							<WarmTooltip content={hint} focusable>
								<span className={styles.metricLabel}>
									{label}
									<IconInfoCircle size={14} aria-hidden="true" />
								</span>
							</WarmTooltip>
						</div>
						<div className={styles.metricValue}>
							{formatNumber(value)}
							{key !== "orders" && <span>шт.</span>}
						</div>
						<div className={styles.metricBreakdown}>
							<MetricBreakdown metric={key} report={report} />
						</div>
						{before !== undefined && (
							<small className={styles.metricComparison}>
								{value >= before ? "+" : ""}
								{formatNumber(value - before)} к предыдущему периоду
							</small>
						)}
					</div>
				),
			)}
		</Card>
	);
}

function MetricBreakdown({
	metric,
	report,
}: {
	metric: MetricKey;
	report: WarehouseReport;
}) {
	if (metric === "orders") {
		return (
			<>
				<span data-tone="active">
					<b>{report.active}</b>В работе
				</span>
				<span data-tone="completed">
					<b>{report.completed}</b>Завершено
				</span>
				{report.cancelled > 0 && (
					<span>
						<b>{report.cancelled}</b>Отменено
					</span>
				)}
			</>
		);
	}

	if (metric === "stock") {
		const available = Math.max(0, report.stockQuantity - report.reserved);

		return (
			<>
				<span data-tone="reserved">
					<b>{formatNumber(report.reserved)}</b>В резерве
				</span>
				<span data-tone="completed">
					<b>{formatNumber(available)}</b>
					Доступно
				</span>
			</>
		);
	}

	const orderCount = report.orders.filter(
		(order) => order.kind === metric,
	).length;

	return (
		<span>
			Заказов: <b>{orderCount}</b>
		</span>
	);
}
