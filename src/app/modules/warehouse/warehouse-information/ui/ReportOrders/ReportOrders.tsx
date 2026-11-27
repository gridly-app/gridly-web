import type { Ref } from "react";

import { StatusBadge } from "@/ports/warehouse";
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

import { formatNumber } from "../../lib/formatNumber";
import type { WarehouseReport } from "../../model/report";
import {
	formatRange,
	formatShortDay,
	type ReportRange,
	warehouseDay,
} from "../../model/reportPeriod";
import { reportOrderPageSize } from "../../model/useReportFilters";

import layoutStyles from "../../shared.module.css";

const orderKinds = {
	inbound: { label: "Поставка", tone: "success" },
	outbound: { label: "Отгрузка", tone: "accent" },
} as const;

export function ReportOrders({
	orders,
	selectedRange,
	sectionRef,
	timezone,
	limit,
	onClearRange,
	onLoadMore,
}: {
	orders: WarehouseReport["orders"];
	selectedRange: ReportRange | null;
	sectionRef: Ref<HTMLElement>;
	timezone: string;
	limit: number;
	onClearRange: () => void;
	onLoadMore: () => void;
}) {
	const columns = useTableColumns("report-orders", [
		"Направление",
		"Контрагент",
		"Количество",
		"Статус",
		"Дата",
	]);
	const title = selectedRange
		? `Операции: ${formatRange(selectedRange)}`
		: "Операции за период";
	const description = selectedRange
		? "Детализация выбранной точки графика."
		: "Выберите точку графика, статус или категорию, чтобы сузить список.";
	const nextPageSize = Math.min(reportOrderPageSize, orders.length - limit);

	return (
		<section
			ref={sectionRef}
			tabIndex={-1}
			className={layoutStyles.chartCard}
			aria-label="Операции за выбранный период"
		>
			<div className={layoutStyles.chartHeading}>
				<div>
					<h3>{title}</h3>
					<p>{description}</p>
				</div>
				<div className={layoutStyles.headerActions}>
					<div className={layoutStyles.tableControls}>
						<Badge tone="neutral">{orders.length} операций</Badge>
						{orders.length > 0 && columns.button}
					</div>
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
							{orders.slice(0, limit).map((order) => {
								const kind = orderKinds[order.kind];
								const quantity = order.lines.reduce(
									(sum, line) => sum + line.quantity,
									0,
								);

								return (
									<TableRow key={order.id}>
										<TableCell>
											<strong>{order.number}</strong>
										</TableCell>
										<TableCell>
											<Badge tone={kind.tone}>{kind.label}</Badge>
										</TableCell>
										<TableCell>{order.party}</TableCell>
										<TableCell>{formatNumber(quantity)} шт.</TableCell>
										<TableCell>
											<StatusBadge value={order.status} />
										</TableCell>
										<TableCell>
											{formatShortDay(warehouseDay(order.created, timezone))}
										</TableCell>
									</TableRow>
								);
							})}
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
					Показать ещё {nextPageSize}
				</Button>
			)}
		</section>
	);
}
