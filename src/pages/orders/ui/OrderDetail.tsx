import { useSearchParams } from "react-router-dom";
import {
	forecastLabel,
	orderCompletion,
	orderValue,
	useSimulationCadence,
} from "@/entities/warehouse";
import { Button, ErrorNotice, WarmTooltip } from "@/shared/ui";
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
	const cadence = useSimulationCadence(props.w);
	const cost = orderValue(props.o, props.w.products);
	const forecast = orderCompletion(props.o, props.w, cadence);
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
				<div>
					<dt>
						{props.o.kind === "inbound"
							? "Ожидаемое размещение"
							: "Ожидаемая отгрузка"}
					</dt>
					<dd>
						<WarmTooltip content={forecast.note} focusable>
							<span>{forecastLabel(forecast, props.w.timezone)}</span>
						</WarmTooltip>
					</dd>
				</div>
			</dl>
			<OrderLines model={presentation} />
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
		</>
	);
}
