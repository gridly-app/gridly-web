import {
	IconCheck,
	IconChevronDown,
	IconChevronRight,
	IconEye,
	IconPlayerPlay,
} from "@tabler/icons-react";
import {
	StatusBadge as Badge,
	type Order,
	useOrder,
	type Warehouse,
} from "@/entities/warehouse";
import { Button, IconButton } from "@/shared/ui/controls";
import { TableActions, TableCell, TableRow } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { getOrderPresentation } from "../../model/getOrderPresentation";
import type { useOrderSelection } from "../../model/useOrderSelection";
import type { useOrdersPage } from "../../model/useOrdersPage";
import { OrderLines } from "../details/OrderLines";
import styles from "./OrderRow.module.css";

interface OrderRowProps {
	order: ReturnType<typeof useOrdersPage>["visibleOrders"][number];
	warehouse: Warehouse;
	expanded: boolean;
	pending: boolean;
	onToggle: () => void;
	onDetail: ReturnType<typeof useOrderSelection>["setDetail"];
	onStart: ReturnType<typeof useOrdersPage>["startOrder"];
	onConfirm: ReturnType<typeof useOrdersPage>["confirmOrder"];
}

export function OrderRow({
	order,
	warehouse,
	expanded,
	pending,
	onToggle,
	onDetail,
	onStart,
	onConfirm,
}: OrderRowProps) {
	return (
		<>
			<TableRow>
				<TableCell>
					<TableActions>
						<IconButton
							label={`Состав заказа ${order.number}`}
							aria-expanded={expanded}
							icon={
								expanded ? (
									<IconChevronDown size={16} />
								) : (
									<IconChevronRight size={16} />
								)
							}
							onClick={onToggle}
						/>
						<Button
							size="sm"
							variant="ghost"
							className={styles.orderLink}
							onClick={() => onDetail(order.id)}
						>
							{order.number}
						</Button>
					</TableActions>
				</TableCell>
				<TableCell>{order.party}</TableCell>
				<TableCell>{order.quantity ?? "—"} шт.</TableCell>
				<TableCell
					title={
						order.cost.unknown
							? `Без цены: ${order.cost.unknown} шт.`
							: "Стоимость по ценам каталога"
					}
				>
					{order.cost.unknown > 0 ? (
						<Button
							variant="text"
							size="sm"
							onClick={() => onDetail(order.id, true)}
							aria-label={`${order.number}: товары без цены`}
						>
							{order.cost.label} · без цены: {order.cost.unknown} шт. →
						</Button>
					) : (
						<strong>{order.cost.label}</strong>
					)}
				</TableCell>
				<TableCell>{order.createdLabel}</TableCell>
				<TableCell>
					<Badge value={order.status} />
				</TableCell>
				<TableCell>
					<TableActions>
						{order.canStart ? (
							<IconButton
								label="Запустить"
								icon={<IconPlayerPlay size={16} />}
								variant="default"
								disabled={pending}
								onClick={() => void onStart(order.id)}
							/>
						) : order.canConfirm ? (
							<IconButton
								label="Подтвердить этап"
								icon={<IconCheck size={16} />}
								variant="default"
								disabled={pending}
								onClick={() => void onConfirm(order.id)}
							/>
						) : (
							<IconButton
								label="Подробнее"
								icon={<IconEye size={16} />}
								variant="secondary"
								onClick={() => onDetail(order.id)}
							/>
						)}
					</TableActions>
				</TableCell>
			</TableRow>
			{expanded && (
				<TableRow>
					<TableCell colSpan={7} className={styles.expandedOrder}>
						<ExpandedOrder order={order} warehouse={warehouse} />
					</TableCell>
				</TableRow>
			)}
		</>
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
				action={<RetryButton onRetry={() => query.refetch()} />}
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
