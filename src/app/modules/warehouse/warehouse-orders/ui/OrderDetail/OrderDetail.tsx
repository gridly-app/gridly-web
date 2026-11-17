import { Link, useSearchParams } from "react-router-dom";
import type { Order } from "@/domain/warehouse";
import { orderValue } from "@/domain/warehouse";
import { shipmentManagementPath, warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge as Badge } from "@/ports/warehouse";
import { Button } from "@/shared/ui/controls";
import { DetailFact, DetailFacts } from "@/shared/ui/dataDisplay";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";
import { getOrderPresentation } from "../../model/getOrderPresentation";
import type { OrderDetailOptions } from "../../model/useOrderDetail";
import { useOrderDetail } from "../../model/useOrderDetail";
import { OrderActions } from "../OrderActions/OrderActions";
import styles from "./OrderDetail.module.css";
import { OrderLines } from "../OrderLines/OrderLines";
import { OrderReasonForm } from "../OrderReasonForm/OrderReasonForm";

export type OrderDetailProps = OrderDetailOptions;

export function OrderDetail(props: OrderDetailProps) {
	const model = useOrderDetail(props);
	const mode = useWorkspaceMode();
	const [, setParams] = useSearchParams();
	const cost = orderValue(props.o, props.w.products);
	const presentation = getOrderPresentation(props.o, props.w);

	return (
		<>
			<OrderSummary model={{ o: props.o }} />
			<DetailFacts>
				<DetailFact label="Стоимость заказа">
					{cost.unknown > 0 ? (
						<Button
							className={styles.costLink}
							variant="text"
							size="sm"
							onClick={() =>
								setParams(
									(current) => {
										const next = new URLSearchParams(current);
										next.set("highlight", "unpriced");
										return next;
									},
									{ replace: true },
								)
							}
						>
							{cost.label} · без цены: {cost.unknown} шт. →
						</Button>
					) : (
						cost.label
					)}
				</DetailFact>
				<DetailFact label="Создан">
					{new Date(props.o.created).toLocaleString("ru-RU", {
						timeZone: props.w.timezone,
					})}
				</DetailFact>
			</DetailFacts>
			<OrderActions model={model} />
			<Link
				to={`${warehousePath(mode, props.w.id, "deliveries")}?${new URLSearchParams({ order: props.o.id })}`}
			>
				Отследить доставку
			</Link>
			{props.o.kind === "outbound" && mode === "standard" && (
				<Link to={shipmentManagementPath(props.w.id, props.o.id)}>
					Управление отгрузкой
				</Link>
			)}
			<OrderTasks
				model={{
					tasks: presentation.tasks,
					pending: props.pending,
					confirmTask: model.confirmTask,
				}}
			/>
			<ErrorNotice message={model.error} />
			<OrderReasonForm model={model} />
			<OrderLines
				key={props.o.id}
				warehouseId={props.w.id}
				model={presentation}
			/>
		</>
	);
}

interface OrderSummaryProps {
	model: { o: Order };
}

function OrderSummary({ model }: OrderSummaryProps) {
	const { o } = model;

	return (
		<>
			<div className={styles.summary}>
				<div className={styles.heading}>
					<h3>{o.number}</h3>
					<Badge value={o.status} />
				</div>
				<p>{o.party}</p>
			</div>
			{(o.blockedReason || o.reason) && (
				<Feedback tone="error" role="alert">
					{o.blockedReason || o.reason}
				</Feedback>
			)}
			{o.status === "aborting" && (
				<Feedback tone="info">
					Груз возвращается на хранение. Док остаётся занят до завершения
					возврата.
				</Feedback>
			)}
		</>
	);
}

interface OrderTasksProps {
	model: Pick<ReturnType<typeof useOrderDetail>, "pending" | "confirmTask"> &
		Pick<ReturnType<typeof getOrderPresentation>, "tasks">;
}

function OrderTasks({ model }: OrderTasksProps) {
	const { tasks, pending } = model;

	return tasks?.flatMap(
		(task) =>
			task.confirmationActions?.map((action) => (
				<Button
					variant="secondary"
					disabled={pending}
					key={`${task.id}:${action.id}`}
					onClick={() => void model.confirmTask(task, action.id)}
				>
					{action.label}
				</Button>
			)) ?? [],
	);
}
