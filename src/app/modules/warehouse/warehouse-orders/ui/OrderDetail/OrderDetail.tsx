import type { WarehouseView } from "@/domain/warehouse";
import { Link } from "react-router-dom";

import { type Order, orderValue } from "@/domain/warehouse";
import { shipmentManagementPath, warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge } from "@/ports/warehouse";
import { useUpdateSearchParams } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { DetailFact, DetailFacts } from "@/shared/ui/dataDisplay";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";

import { getOrderPresentation } from "../../model/getOrderPresentation";
import {
	type OrderDetailOptions,
	useOrderDetail,
} from "../../model/useOrderDetail";
import { OrderActions } from "../OrderActions/OrderActions";
import { OrderLines } from "../OrderLines/OrderLines";
import { OrderReasonForm } from "../OrderReasonForm/OrderReasonForm";

import styles from "./OrderDetail.module.css";

export function OrderDetail({
	warehouse,
	...options
}: OrderDetailOptions & { warehouse: WarehouseView<"catalog" | "robots"> }) {
	const { order } = options;
	const model = useOrderDetail(options);
	const mode = useWorkspaceMode();
	const updateSearchParams = useUpdateSearchParams();
	const cost = orderValue(order, warehouse.products);
	const presentation = getOrderPresentation(order, warehouse);
	const createdLabel = new Date(order.created).toLocaleString("ru-RU", {
		timeZone: warehouse.timezone,
	});
	const deliveryLink = `${warehousePath(mode, warehouse.id, "deliveries")}?${new URLSearchParams({ order: order.id })}`;

	function handleShowUnpriced() {
		updateSearchParams({ highlight: "unpriced" });
	}

	return (
		<>
			<OrderSummary order={order} />
			<DetailFacts>
				<DetailFact label="Стоимость заказа">
					{cost.unknown > 0 ? (
						<Button
							className={styles.costLink}
							variant="text"
							size="sm"
							onClick={handleShowUnpriced}
						>
							{cost.label} · без цены: {cost.unknown} шт. →
						</Button>
					) : (
						cost.label
					)}
				</DetailFact>
				<DetailFact label="Создан">{createdLabel}</DetailFact>
			</DetailFacts>
			<OrderActions model={model} />
			<Link to={deliveryLink}>Отследить доставку</Link>
			{order.kind === "outbound" && (
				<Link to={shipmentManagementPath(mode, warehouse.id, order.id)}>
					Управление отгрузкой
				</Link>
			)}
			<OrderTasks
				tasks={presentation.tasks}
				isPending={options.pending}
				onConfirm={model.confirmTask}
			/>
			<ErrorNotice message={model.error} />
			<OrderReasonForm model={model} />
			<OrderLines
				key={order.id}
				warehouseId={warehouse.id}
				model={presentation}
			/>
		</>
	);
}

function OrderSummary({ order }: { order: Order }) {
	const problem = order.blockedReason || order.reason;

	return (
		<>
			<div className={styles.summary}>
				<div className={styles.heading}>
					<h3>{order.number}</h3>
					<StatusBadge value={order.status} />
				</div>
				<p>{order.party}</p>
			</div>
			{problem && (
				<Feedback tone="error" role="alert">
					{problem}
				</Feedback>
			)}
			{order.status === "aborting" && (
				<Feedback tone="info">
					Груз возвращается на хранение. Док остаётся занят до завершения
					возврата.
				</Feedback>
			)}
		</>
	);
}

function OrderTasks({
	tasks,
	isPending,
	onConfirm,
}: {
	tasks: ReturnType<typeof getOrderPresentation>["tasks"];
	isPending: boolean;
	onConfirm: ReturnType<typeof useOrderDetail>["confirmTask"];
}) {
	const buttons = (tasks ?? []).flatMap((task) =>
		(task.confirmationActions ?? []).map((action) => ({ task, action })),
	);

	return buttons.map(({ task, action }) => (
		<Button
			variant="secondary"
			disabled={isPending}
			key={`${task.id}:${action.id}`}
			onClick={() => void onConfirm(task, action.id)}
		>
			{action.label}
		</Button>
	));
}
