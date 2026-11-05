import { IconTrash } from "@tabler/icons-react";
import { Combobox, Field, IconButton, Input } from "@/shared/ui";
import type { useOrderForm } from "../model/useOrderForm";
import ordersStyles from "./OrdersPage.module.css";

export interface OrderLineFieldsProps {
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

export function OrderLineFields({ line, model }: OrderLineFieldsProps) {
	const { products, kind } = model;

	return (
		<div className={ordersStyles.orderLine}>
			<Field className={ordersStyles.lineField} label="Товар">
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
			<div className={ordersStyles.lineControls}>
				<Field className={ordersStyles.lineField} label="Количество">
					<Input
						type="number"
						min={1}
						value={line.quantity}
						onChange={(event) => model.changeQuantity(line.key, event)}
						required
					/>
				</Field>
				{kind === "inbound" && (
					<Field className={ordersStyles.lineField} label="Годность партии">
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
