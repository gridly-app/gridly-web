import { IconPlayerPlay } from "@tabler/icons-react";
import { StatusBadge as Badge } from "@/entities/warehouse";
import {
	Button,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import type { useOrdersPage } from "../model/useOrdersPage";
import ordersStyles from "./OrdersPage.module.css";

export interface OrdersTableProps {
	model: Pick<
		ReturnType<typeof useOrdersPage>,
		| "statistics"
		| "visibleOrders"
		| "page"
		| "pending"
		| "startOrder"
		| "confirmOrder"
	> &
		Pick<ReturnType<typeof useOrderDialogs>, "setDetail">;
}

export function OrdersTable({ model }: OrdersTableProps) {
	const { statistics, visibleOrders, page, pending } = model;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Заказ</TableHead>
					<TableHead>
						{page === "inbound" ? "Поставщик" : "Получатель"}
					</TableHead>
					<TableHead>Позиций</TableHead>
					<TableHead>Создан</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead>
						<div className={ordersStyles.orderStatistics}>
							<b>
								{page === "inbound" ? "Поставок" : "Отгрузок"}:{" "}
								{statistics.total}
							</b>
							<small>
								В работе: {statistics.active} · Завершено:{" "}
								{statistics.completed}
							</small>
						</div>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{visibleOrders.map((o) => (
					<TableRow key={o.id}>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									className={ordersStyles.orderLink}
									onClick={() => model.setDetail(o.id)}
								>
									{o.number}
								</Button>
							</TableActions>
						</TableCell>
						<TableCell>{o.party}</TableCell>
						<TableCell>{o.quantity} шт.</TableCell>
						<TableCell>{o.createdLabel}</TableCell>
						<TableCell>
							<Badge value={o.status} />
						</TableCell>
						<TableCell>
							<TableActions>
								{o.canStart ? (
									<Button
										size="sm"
										variant="ghost"
										disabled={pending}
										onClick={() => void model.startOrder(o.id)}
									>
										Запустить <IconPlayerPlay size={14} />
									</Button>
								) : o.canConfirm ? (
									<Button
										size="sm"
										variant="default"
										disabled={pending}
										onClick={() => void model.confirmOrder(o.id)}
									>
										Подтвердить этап
									</Button>
								) : (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => model.setDetail(o.id)}
									>
										Подробнее
									</Button>
								)}
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
