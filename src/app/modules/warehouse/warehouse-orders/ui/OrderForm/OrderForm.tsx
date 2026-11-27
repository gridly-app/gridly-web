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

import { type OrderFormOptions, useOrderForm } from "../../model/useOrderForm";

import styles from "./OrderForm.module.css";

type OrderFormModel = ReturnType<typeof useOrderForm>;

const partyMaxLength = 500;

export function OrderForm(props: OrderFormOptions) {
	const model = useOrderForm(props);
	const { pending, order, handleSubmit, kind } = model;
	const partyLabel =
		kind === "inbound" ? "Поставщик *" : "Получатель / адрес *";

	return (
		<FormShell
			pending={pending}
			submitLabel={order ? "Сохранить черновик" : "Создать черновик"}
			onSubmit={handleSubmit}
		>
			<Fieldset className={styles.formFields} disabled={pending}>
				<Field label={partyLabel}>
					<Input
						name="party"
						value={model.party}
						onChange={model.changeParty}
						required
						maxLength={partyMaxLength}
					/>
				</Field>
				<OrderLinesFields model={model} />
				<OrderConfirmations model={model} />
			</Fieldset>
		</FormShell>
	);
}

function OrderLinesFields({
	model,
}: {
	model: Pick<
		OrderFormModel,
		| "lines"
		| "products"
		| "kind"
		| "addLine"
		| "changeProduct"
		| "changeQuantity"
		| "changeExpires"
		| "removeLine"
	>;
}) {
	return (
		<>
			<div className={styles.caption}>ПОЗИЦИИ ЗАКАЗА</div>
			{model.lines.map((line) => (
				<OrderLineFields key={line.key} line={line} model={model} />
			))}
			<Button variant="ghost" type="button" onClick={model.addLine}>
				<IconPlus size={16} />
				Добавить позицию
			</Button>
		</>
	);
}

function OrderLineFields({
	line,
	model,
}: {
	line: OrderFormModel["lines"][number];
	model: Pick<
		OrderFormModel,
		| "products"
		| "kind"
		| "changeProduct"
		| "changeQuantity"
		| "changeExpires"
		| "removeLine"
	>;
}) {
	const productOptions = model.products.map((product) => ({
		value: product.id,
		label: `${product.name} · ${product.volume} м³`,
	}));

	return (
		<div className={styles.orderLine}>
			<Field className={styles.lineField} label="Товар">
				<Combobox
					value={line.product}
					onValueChange={(product) => model.changeProduct(line.key, product)}
					required
					placeholder="Выберите товар"
					options={productOptions}
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
				{model.kind === "inbound" && (
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

function OrderConfirmations({
	model,
}: {
	model: Pick<OrderFormModel, "confirmations" | "resetManual" | "updateManual">;
}) {
	const controlId = useId();

	return (
		<>
			<p className={styles.caption}>РУЧНЫЕ ПОДТВЕРЖДЕНИЯ</p>
			<div className={styles.choices}>
				{model.confirmations.map((confirmation) => (
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
			<Button variant="text" type="button" onClick={model.resetManual}>
				Вернуть настройки склада
			</Button>
		</>
	);
}
