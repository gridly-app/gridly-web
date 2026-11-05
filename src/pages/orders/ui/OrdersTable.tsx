import { IconCheck, IconEye, IconPlayerPlay } from "@tabler/icons-react";
import { StatusBadge as Badge } from "@/entities/warehouse";

import {
	Button,
	IconButton,
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
	const { visibleOrders, page, pending } = model;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Заказ</TableHead>
					<TableHead>
						{page === "inbound" ? "Поставщик" : "Получатель"}
					</TableHead>
					<TableHead>Товаров</TableHead>
					<TableHead>Стоимость</TableHead>
					<TableHead>Создан</TableHead>
					<TableHead>
						{page === "inbound" ? "Ожидаемое размещение" : "Ожидаемая отгрузка"}
					</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead>Действия</TableHead>
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
						<TableCell>{o.quantity ?? "—"} шт.</TableCell>
						<TableCell
							title={
								o.cost.unknown
									? `Без цены: ${o.cost.unknown} шт.`
									: "Стоимость по ценам каталога"
							}
						>
							{o.cost.unknown > 0 ? (
								<Button
									variant="text"
									size="sm"
									onClick={() => model.setDetail(o.id, true)}
									aria-label={`${o.number}: товары без цены`}
								>
									{o.cost.label} · без цены: {o.cost.unknown} шт. →
								</Button>
							) : (
								<strong>{o.cost.label}</strong>
							)}
						</TableCell>
						<TableCell>{o.createdLabel}</TableCell>
						<TableCell title={o.forecast.note}>
							<span>{o.completionLabel}</span>
						</TableCell>
						<TableCell>
							<Badge value={o.status} />
						</TableCell>
						<TableCell>
							<TableActions>
								{o.canStart ? (
									<IconButton
										label="Запустить"
										icon={<IconPlayerPlay size={16} />}
										variant="default"
										disabled={pending}
										onClick={() => void model.startOrder(o.id)}
									/>
								) : o.canConfirm ? (
									<IconButton
										label="Подтвердить этап"
										icon={<IconCheck size={16} />}
										variant="default"
										disabled={pending}
										onClick={() => void model.confirmOrder(o.id)}
									/>
								) : (
									<IconButton
										label="Подробнее"
										icon={<IconEye size={16} />}
										variant="secondary"
										onClick={() => model.setDetail(o.id)}
									/>
								)}
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
