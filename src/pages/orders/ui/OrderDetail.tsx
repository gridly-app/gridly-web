import { ErrorNotice } from "@/shared/ui";
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
	const presentation = getOrderPresentation(props.o, props.w);

	return (
		<>
			<OrderSummary model={{ o: props.o }} />
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
