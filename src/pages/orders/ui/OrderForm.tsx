import { Field, FormShell, Input } from "@/shared/ui";
import type { OrderFormOptions } from "../model/useOrderForm";
import { useOrderForm } from "../model/useOrderForm";
import { OrderConfirmations } from "./OrderConfirmations";
import { OrderLinesFields } from "./OrderLinesFields";

export type OrderFormProps = OrderFormOptions;

export function OrderForm(props: OrderFormProps) {
	const model = useOrderForm(props);
	const { pending, order, handleSubmit, kind } = model;

	return (
		<FormShell
			pending={pending}
			submitLabel={order ? "Сохранить черновик" : "Создать черновик"}
			onSubmit={handleSubmit}
		>
			<Field
				label={kind === "inbound" ? "Поставщик *" : "Получатель / адрес *"}
			>
				<Input
					name="party"
					defaultValue={order?.party}
					required
					maxLength={500}
				/>
			</Field>

			<OrderLinesFields model={model} />
			<OrderConfirmations model={model} />
		</FormShell>
	);
}
