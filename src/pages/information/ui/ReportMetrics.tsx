import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconBox,
	IconClipboardList,
	IconInfoCircle,
} from "@tabler/icons-react";
import { Card, WarmTooltip } from "@/shared/ui";
import type { WarehouseReport } from "../model/chartData";
import styles from "./InformationPage.module.css";

export function ReportMetrics({
	report,
	previous,
}: {
	report: WarehouseReport;
	previous: WarehouseReport | null;
}) {
	const inbound = report.inbound.known + report.inbound.unknown;
	const outbound = report.outbound.known + report.outbound.unknown;
	const items = [
		{
			key: "orders",
			label: "Заказы",
			value: report.orders.length,
			before: previous?.orders.length,
			icon: IconClipboardList,
			hint: "Заказы по дате создания с учётом периода, направления, статуса и категории отчёта.",
		},
		{
			key: "inbound",
			label: "Поставки",
			value: inbound,
			before: previous
				? previous.inbound.known + previous.inbound.unknown
				: undefined,
			icon: IconArrowDownLeft,
			hint: "Количество товаров в заказах на поставку за выбранный период. Это состав заказов, а не фактически размещённые остатки.",
		},
		{
			key: "outbound",
			label: "Отгрузки",
			value: outbound,
			before: previous
				? previous.outbound.known + previous.outbound.unknown
				: undefined,
			icon: IconArrowUpRight,
			hint: "Количество товаров в заказах на отгрузку за выбранный период с учётом фильтров отчёта.",
		},
		{
			key: "stock",
			label: "На складе",
			value: report.stockQuantity,
			before: undefined,
			icon: IconBox,
			hint: "Фактические остатки сейчас, включая резерв. Ожидаемые поступления сюда не входят. Учитывается категория, период не применяется.",
		},
	];
	return (
		<Card
			render={<section />}
			className={styles.summary}
			aria-label="Основные показатели склада"
		>
			{items.map(({ key, label, value, before, icon: Icon, hint }) => (
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
						{value.toLocaleString("ru-RU")}
						{key !== "orders" && <span>шт.</span>}
					</div>
					<div className={styles.metricBreakdown}>
						{key === "orders" ? (
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
						) : key === "stock" ? (
							<>
								<span data-tone="reserved">
									<b>{report.reserved.toLocaleString("ru-RU")}</b>В резерве
								</span>
								<span data-tone="completed">
									<b>
										{Math.max(
											0,
											report.stockQuantity - report.reserved,
										).toLocaleString("ru-RU")}
									</b>
									Доступно
								</span>
							</>
						) : (
							<span>
								Заказов:{" "}
								<b>
									{report.orders.filter((order) => order.kind === key).length}
								</b>
							</span>
						)}
					</div>
					{before !== undefined && (
						<small className={styles.metricComparison}>
							{value >= before ? "+" : ""}
							{(value - before).toLocaleString("ru-RU")} к предыдущему периоду
						</small>
					)}
				</div>
			))}
		</Card>
	);
}
