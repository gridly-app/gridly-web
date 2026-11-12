import type { Ref } from "react";
import { StatusBadge } from "@/entities/warehouse";
import { Button } from "@/shared/ui/controls";
import {
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	useTableColumns,
} from "@/shared/ui/dataDisplay";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";
import { shortDay, type WarehouseReport } from "../model/chartData";
import { warehouseDay } from "../model/report";
import {
	type ReportRange,
	reportOrderPageSize,
} from "../model/useReportFilters";
import chartStyles from "./charts/ReportChart.module.css";
import layoutStyles from "./InformationPage.module.css";

interface ReportOrdersProps {
	orders: WarehouseReport["orders"];
	selectedRange: ReportRange | null;
	sectionRef: Ref<HTMLElement>;
	timezone: string;
	limit: number;
	onClearRange: () => void;
	onLoadMore: () => void;
}

export function ReportOrders({
	orders,
	selectedRange,
	sectionRef,
	timezone,
	limit,
	onClearRange,
	onLoadMore,
}: ReportOrdersProps) {
	const columns = useTableColumns("report-orders", [
		"Направление",
		"Контрагент",
		"Количество",
		"Статус",
		"Дата",
	]);

	return (
		<section
			ref={sectionRef}
			tabIndex={-1}
			className={chartStyles.chartCard}
			aria-label="Операции за выбранный период"
		>
			<div className={chartStyles.chartHeading}>
				<div>
					<h3>
						{selectedRange
							? `Операции: ${shortDay(selectedRange.from)}${selectedRange.from !== selectedRange.to ? ` — ${shortDay(selectedRange.to)}` : ""}`
							: "Операции за период"}
					</h3>
					<p>
						{selectedRange
							? "Детализация выбранной точки графика."
							: "Выберите точку графика, статус или категорию, чтобы сузить список."}
					</p>
				</div>
				<div className={layoutStyles.headerActions}>
					<Badge tone="neutral">{orders.length} операций</Badge>
					{orders.length > 0 && columns.button}
					{selectedRange && (
						<Button variant="text" size="sm" onClick={onClearRange}>
							Весь период
						</Button>
					)}
				</div>
			</div>
			{orders.length ? (
				<div className={layoutStyles.tableScroll}>
					<Table hiddenColumns={columns.hiddenColumns}>
						<TableHeader>
							<TableRow>
								<TableHead>Заказ</TableHead>
								<TableHead>Направление</TableHead>
								<TableHead>Контрагент</TableHead>
								<TableHead>Количество</TableHead>
								<TableHead>Статус</TableHead>
								<TableHead>Дата</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.slice(0, limit).map((order) => (
								<TableRow key={order.id}>
									<TableCell>
										<strong>{order.number}</strong>
									</TableCell>
									<TableCell>
										<Badge
											tone={order.kind === "inbound" ? "success" : "accent"}
										>
											{order.kind === "inbound" ? "Поставка" : "Отгрузка"}
										</Badge>
									</TableCell>
									<TableCell>{order.party}</TableCell>
									<TableCell>
										{order.lines
											.reduce((sum, line) => sum + line.quantity, 0)
											.toLocaleString("ru-RU")}{" "}
										шт.
									</TableCell>
									<TableCell>
										<StatusBadge value={order.status} />
									</TableCell>
									<TableCell>
										{shortDay(warehouseDay(order.created, timezone))}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<Empty>
					<EmptyDescription>
						Нет операций с выбранными фильтрами.
					</EmptyDescription>
				</Empty>
			)}
			{orders.length > limit && (
				<Button variant="secondary" onClick={onLoadMore}>
					Показать ещё {Math.min(reportOrderPageSize, orders.length - limit)}
				</Button>
			)}
		</section>
	);
}
