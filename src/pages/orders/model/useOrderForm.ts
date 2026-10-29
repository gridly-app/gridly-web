import type { ChangeEvent } from "react";
import { useState } from "react";
import type { Order, OrderInput, Warehouse } from "@/entities/warehouse";
import { confirmationLabels, workflowKeys } from "@/entities/warehouse";
import { initialOrderForm, type OrderFormValues } from "./orderFormDrafts";
import { orderFromForm } from "./orderFromForm";

export interface OrderFormOptions {
	kind: Order["kind"];
	order?: Order | undefined;
	warehouse: Warehouse;
	pending: boolean;
	onSave: (order: OrderInput) => Promise<void>;
	values?: OrderFormValues | undefined;
	onValuesChange?: ((values: OrderFormValues) => void) | undefined;
}

export function useOrderForm({
	kind,
	order,
	warehouse,
	pending,
	onSave,
	values,
	onValuesChange,
}: OrderFormOptions) {
	const [local, setLocal] = useState(() => initialOrderForm(warehouse, order));
	const current = values ?? local;
	function update(next: OrderFormValues) {
		if (pending) return;
		if (onValuesChange) onValuesChange(next);
		else setLocal(next);
	}
	function handleSubmit(data: FormData): Promise<void> {
		return onSave(
			orderFromForm(data, {
				kind,
				order,
				warehouse,
				lines: current.lines.map(({ id, product, quantity, expires }) => ({
					id,
					product,
					quantity: Number(quantity),
					expires,
				})),
				manual: current.manual,
			}),
		);
	}
	function updateLine(
		key: string,
		patch: Partial<OrderFormValues["lines"][number]>,
	) {
		update({
			...current,
			lines: current.lines.map((line) =>
				line.key === key ? { ...line, ...patch } : line,
			),
		});
	}
	return {
		pending,
		order,
		kind,
		handleSubmit,
		party: current.party,
		changeParty: (event: ChangeEvent<HTMLInputElement>) =>
			update({ ...current, party: event.target.value }),
		lines: current.lines,
		products: warehouse.products.filter((product) => !product.archived),
		confirmations: workflowKeys.map((key, index) => ({
			key,
			checked: current.manual[key],
			label: confirmationLabels[index],
			index,
		})),
		changeProduct: (key: string, product: string) =>
			updateLine(key, { product }),
		changeQuantity: (key: string, event: ChangeEvent<HTMLInputElement>) =>
			updateLine(key, { quantity: event.target.value }),
		changeExpires: (key: string, event: ChangeEvent<HTMLInputElement>) =>
			updateLine(key, { expires: event.target.value }),
		addLine: () =>
			update({
				...current,
				lines: [
					...current.lines,
					{ key: crypto.randomUUID(), product: "", quantity: "1", expires: "" },
				],
			}),
		removeLine: (key: string) =>
			update({
				...current,
				lines: current.lines.filter((line) => line.key !== key),
			}),
		updateManual: (key: (typeof workflowKeys)[number], checked: boolean) =>
			update({
				...current,
				manual: {
					...current.manual,
					[key]: checked,
				},
			}),
		resetManual: () => update({ ...current, manual: { ...warehouse.policy } }),
	};
}
