import { useSearchParams } from "react-router-dom";
import { orderValue } from "@/entities/warehouse";
import { Button, ErrorNotice } from "@/shared/ui";
import { getOrderPresentation } from "../model/getOrderPresentation";
import type { OrderDetailOptions } from "../model/useOrderDetail";
import { useOrderDetail } from "../model/useOrderDetail";
import { OrderActions } from "./OrderActions";
import { OrderLines } from "./OrderLines";
import { OrderReasonForm } from "./OrderReasonForm";
import { OrderSummary } from "./OrderSummary";
import { OrderTasks } from "./OrderTasks";

export type OrderDetailProps = OrderDetailOptions;

export function OrderDetail(props: OrderDetailProps) {
	const model = useOrderDetail(props);
	const [, setParams] = useSearchParams();
	const cost = orderValue(props.o, props.w.products);
	const presentation = getOrderPresentation(props.o, props.w);

	return (
		<>
			<OrderSummary model={{ o: props.o }} />
			<dl className="order-facts">
				<div>
					<dt>Стоимость заказа</dt>
					<dd>
						{cost.unknown > 0 ? (
							<Button
								className="order-cost-link"
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
					</dd>
				</div>
				<div>
					<dt>Создан</dt>
					<dd>
						{new Date(props.o.created).toLocaleString("ru-RU", {
							timeZone: props.w.timezone,
						})}
					</dd>
				</div>
			</dl>
			<OrderActions model={model} />
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
