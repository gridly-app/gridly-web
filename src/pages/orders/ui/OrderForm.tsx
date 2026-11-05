import { Field, Fieldset, FormShell, Input } from "@/shared/ui";
import type { OrderFormOptions } from "../model/useOrderForm";
import { useOrderForm } from "../model/useOrderForm";
import { OrderConfirmations } from "./OrderConfirmations";
import { OrderLinesFields } from "./OrderLinesFields";
import styles from "./OrdersPage.module.css";

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
			<Fieldset className={styles.formFields} disabled={pending}>
				<Field
					label={kind === "inbound" ? "Поставщик *" : "Получатель / адрес *"}
				>
					<Input
						name="party"
						value={model.party}
						onChange={model.changeParty}
						required
						maxLength={500}
					/>
				</Field>

				<OrderLinesFields model={model} />
				<OrderConfirmations model={model} />
			</Fieldset>
		</FormShell>
	);
}
