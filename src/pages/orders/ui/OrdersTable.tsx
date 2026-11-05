import {
	IconCheck,
	IconChevronDown,
	IconChevronRight,
	IconEye,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { Fragment, useState } from "react";
import {
	StatusBadge as Badge,
	type Order,
	useOrder,
	type Warehouse,
} from "@/entities/warehouse";

import {
	Button,
	Feedback,
	IconButton,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import { getOrderPresentation } from "../model/getOrderPresentation";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import type { useOrdersPage } from "../model/useOrdersPage";
import { OrderLines } from "./OrderLines";
import ordersStyles from "./OrdersPage.module.css";

export interface OrdersTableProps {
	warehouse: Warehouse;
	hiddenColumns: readonly number[];
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

export function OrdersTable({
	model,
	warehouse,
	hiddenColumns,
}: OrdersTableProps) {
	const { visibleOrders, page, pending } = model;
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	function toggleOrder(id: string) {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Заказ</TableHead>
					<TableHead>
						{page === "inbound" ? "Поставщик" : "Получатель"}
					</TableHead>
					<TableHead>Товаров</TableHead>
					<TableHead>Стоимость</TableHead>
					<TableHead>Создан</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead>Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{visibleOrders.map((o) => (
					<Fragment key={o.id}>
						<TableRow>
							<TableCell>
								<TableActions>
									<IconButton
										label={`Состав заказа ${o.number}`}
										aria-expanded={expanded.has(o.id)}
										icon={
											expanded.has(o.id) ? (
												<IconChevronDown size={16} />
											) : (
												<IconChevronRight size={16} />
											)
										}
										onClick={() => toggleOrder(o.id)}
									/>
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
						{expanded.has(o.id) && (
							<TableRow>
								<TableCell colSpan={7} className={ordersStyles.expandedOrder}>
									<ExpandedOrder order={o} warehouse={warehouse} />
								</TableCell>
							</TableRow>
						)}
					</Fragment>
				))}
			</TableBody>
		</Table>
	);
}

function ExpandedOrder({
	order,
	warehouse,
}: {
	order: Order;
	warehouse: Warehouse;
}) {
	const query = useOrder(warehouse.id, order.id);
	if (query.supported && query.isPending && !order.lines.length)
		return <Feedback tone="loading">Загружаем состав…</Feedback>;
	if (query.isError && !order.lines.length)
		return (
			<Feedback
				tone="error"
				action={
					<Button
						onClick={() => {
							void query.refetch();
						}}
					>
						Повторить
					</Button>
				}
			>
				Не удалось загрузить состав заказа.
			</Feedback>
		);

	return (
		<OrderLines
			inline
			warehouseId={warehouse.id}
			model={getOrderPresentation(query.data ?? order, warehouse)}
		/>
	);
}
