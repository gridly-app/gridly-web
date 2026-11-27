import {
	IconCheck,
	IconChevronDown,
	IconChevronRight,
	IconEye,
	IconPlayerPlay,
	IconTruckDelivery,
} from "@tabler/icons-react";

import type { Order } from "@/domain/warehouse";
import { shipmentManagementPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge, useOrder } from "@/ports/warehouse";
import { Button, IconButton, IconLink } from "@/shared/ui/controls";
import { TableActions, TableCell, TableRow } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { getOrderPresentation } from "../../model/getOrderPresentation";
import type { useOrderSelection } from "../../model/useOrderSelection";
import type { useOrdersPage } from "../../model/useOrdersPage";
import type { OrderScreenWarehouse } from "../../model/warehouseResources";
import { OrderLines } from "../OrderLines/OrderLines";

import styles from "./OrderRow.module.css";

type OrderRowOrder = ReturnType<typeof useOrdersPage>["visibleOrders"][number];

const orderColumnCount = 7;

interface OrderRowProps {
	order: OrderRowOrder;
	warehouse: OrderScreenWarehouse;
	isExpanded: boolean;
	isPending: boolean;
	onToggle: (orderId: string) => void;
	onDetail: ReturnType<typeof useOrderSelection>["setDetail"];
	onStart: ReturnType<typeof useOrdersPage>["startOrder"];
	onConfirm: ReturnType<typeof useOrdersPage>["confirmOrder"];
}

export function OrderRow({
	order,
	warehouse,
	isExpanded,
	isPending,
	onToggle,
	onDetail,
	onStart,
	onConfirm,
}: OrderRowProps) {
	const mode = useWorkspaceMode();
	const ToggleIcon = isExpanded ? IconChevronDown : IconChevronRight;
	const costHint = order.cost.unknown
		? `Без цены: ${order.cost.unknown} шт.`
		: "Стоимость по ценам каталога";

	function handleToggle() {
		onToggle(order.id);
	}

	function handleDetail() {
		onDetail(order.id);
	}

	function handleUnpricedDetail() {
		onDetail(order.id, true);
	}

	return (
		<>
			<TableRow>
				<TableCell>
					<TableActions>
						<IconButton
							label={`Состав заказа ${order.number}`}
							aria-expanded={isExpanded}
							icon={<ToggleIcon size={16} />}
							onClick={handleToggle}
						/>
						<Button
							size="sm"
							variant="ghost"
							className={styles.orderLink}
							onClick={handleDetail}
						>
							{order.number}
						</Button>
					</TableActions>
				</TableCell>
				<TableCell>{order.party}</TableCell>
				<TableCell>{order.quantity ?? "—"} шт.</TableCell>
				<TableCell title={costHint}>
					{order.cost.unknown > 0 ? (
						<Button
							variant="text"
							size="sm"
							onClick={handleUnpricedDetail}
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
					<StatusBadge value={order.status} />
				</TableCell>
				<TableCell>
					<TableActions>
						{order.kind === "outbound" && (
							<IconLink
								label="Управление отгрузкой"
								icon={<IconTruckDelivery aria-hidden="true" />}
								to={shipmentManagementPath(mode, warehouse.id, order.id)}
							/>
						)}
						<OrderPrimaryAction
							order={order}
							isPending={isPending}
							onStart={onStart}
							onConfirm={onConfirm}
							onDetail={handleDetail}
						/>
					</TableActions>
				</TableCell>
			</TableRow>
			{isExpanded && (
				<TableRow>
					<TableCell
						colSpan={orderColumnCount}
						className={styles.expandedOrder}
					>
						<ExpandedOrder order={order} warehouse={warehouse} />
					</TableCell>
				</TableRow>
			)}
		</>
	);
}

function OrderPrimaryAction({
	order,
	isPending,
	onStart,
	onConfirm,
	onDetail,
}: {
	order: OrderRowOrder;
	isPending: boolean;
	onStart: OrderRowProps["onStart"];
	onConfirm: OrderRowProps["onConfirm"];
	onDetail: () => void;
}) {
	if (order.canStart) {
		return (
			<IconButton
				label="Запустить"
				icon={<IconPlayerPlay size={16} />}
				variant="default"
				disabled={isPending}
				onClick={() => void onStart(order.id)}
			/>
		);
	}

	if (order.canConfirm) {
		const label =
			order.kind === "inbound"
				? "Подтвердить разгрузку"
				: "Подтвердить погрузку";

		return (
			<IconButton
				label={label}
				icon={<IconCheck size={16} />}
				variant="default"
				disabled={isPending}
				onClick={() => void onConfirm(order)}
			/>
		);
	}

	return (
		<IconButton
			label="Подробнее"
			icon={<IconEye size={16} />}
			variant="secondary"
			onClick={onDetail}
		/>
	);
}

function ExpandedOrder({
	order,
	warehouse,
}: {
	order: Order;
	warehouse: OrderScreenWarehouse;
}) {
	const query = useOrder(warehouse.id, order.id);
	const hasLines = order.lines.length > 0;

	if (query.isPending && !hasLines)
		return <Feedback tone="loading">Загружаем состав…</Feedback>;

	if (query.isError && !hasLines) {
		return (
			<Feedback
				tone="error"
				action={<RetryButton onRetry={() => query.refetch()} />}
			>
				Не удалось загрузить состав заказа.
			</Feedback>
		);
	}

	return (
		<OrderLines
			inline
			warehouseId={warehouse.id}
			model={getOrderPresentation(query.data ?? order, warehouse)}
		/>
	);
}
