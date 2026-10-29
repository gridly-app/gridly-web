import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/shared/ui";
import type { useOrderForm } from "../model/useOrderForm";
import localLayout from "./Layout.module.css";
import { OrderLineFields } from "./OrderLineFields";

export interface OrderLinesFieldsProps {
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

export function OrderLinesFields({ model }: OrderLinesFieldsProps) {
	const { lines, addLine } = model;

	return (
		<>
			<div className={localLayout.sectionCaption}>ПОЗИЦИИ ЗАКАЗА</div>
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
