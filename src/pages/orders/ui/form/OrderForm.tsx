import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId } from "react";
import { Button, Checkbox, IconButton, Input } from "@/shared/ui/controls";
import {
	CheckLabel,
	Combobox,
	Field,
	Fieldset,
	FormShell,
} from "@/shared/ui/forms";
import type { OrderFormOptions } from "../../model/useOrderForm";
import { useOrderForm } from "../../model/useOrderForm";
import styles from "./OrderForm.module.css";

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

interface OrderLinesFieldsProps {
	model: Pick<
		ReturnType<typeof useOrderForm>,
		| "lines"
		| "products"
		| "kind"
		| "addLine"
		| "changeProduct"
		| "changeQuantity"
		| "changeExpires"
		| "removeLine"
	>;
}

function OrderLinesFields({ model }: OrderLinesFieldsProps) {
	const { lines, addLine } = model;

	return (
		<>
			<div className={styles.caption}>ПОЗИЦИИ ЗАКАЗА</div>
			{lines.map((line) => (
				<OrderLineFields key={line.key} line={line} model={model} />
			))}
			<Button variant="ghost" type="button" onClick={addLine}>
				<IconPlus size={16} />
				Добавить позицию
			</Button>
		</>
	);
}

interface OrderLineFieldsProps {
	line: ReturnType<typeof useOrderForm>["lines"][number];
	model: Pick<
		ReturnType<typeof useOrderForm>,
		| "products"
		| "kind"
		| "changeProduct"
		| "changeQuantity"
		| "changeExpires"
		| "removeLine"
	>;
}

function OrderLineFields({ line, model }: OrderLineFieldsProps) {
	const { products, kind } = model;

	return (
		<div className={styles.orderLine}>
			<Field className={styles.lineField} label="Товар">
				<Combobox
					value={line.product}
					onValueChange={(product) => model.changeProduct(line.key, product)}
					required
					placeholder="Выберите товар"
					options={products.map((product) => ({
						value: product.id,
						label: `${product.name} · ${product.volume} м³`,
					}))}
				/>
			</Field>
			<div className={styles.lineControls}>
				<Field className={styles.lineField} label="Количество">
					<Input
						type="number"
						min={1}
						value={line.quantity}
						onChange={(event) => model.changeQuantity(line.key, event)}
						required
					/>
				</Field>
				{kind === "inbound" && (
					<Field className={styles.lineField} label="Годность партии">
						<Input
							type="date"
							value={line.expires}
							onChange={(event) => model.changeExpires(line.key, event)}
						/>
					</Field>
				)}
				<IconButton
					icon={<IconTrash size={16} />}
					variant="destructive"
					type="button"
					label="Удалить позицию"
					onClick={() => model.removeLine(line.key)}
				/>
			</div>
		</div>
	);
}

interface OrderConfirmationsProps {
	model: Pick<
		ReturnType<typeof useOrderForm>,
		"confirmations" | "resetManual" | "updateManual"
	>;
}

function OrderConfirmations({ model }: OrderConfirmationsProps) {
	const controlId = useId();
	const { confirmations, resetManual } = model;

	return (
		<>
			<p className={styles.caption}>РУЧНЫЕ ПОДТВЕРЖДЕНИЯ</p>
			<div className={styles.choices}>
				{confirmations.map((confirmation) => (
					<CheckLabel
						key={confirmation.label}
						htmlFor={`${controlId}-${confirmation.index}`}
					>
						<Checkbox
							id={`${controlId}-${confirmation.index}`}
							checked={confirmation.checked}
							onCheckedChange={(checked) =>
								model.updateManual(confirmation.key, checked)
							}
						/>
						{confirmation.label}
					</CheckLabel>
				))}
			</div>
			<Button variant="text" type="button" onClick={resetManual}>
				Вернуть настройки склада
			</Button>
		</>
	);
}
