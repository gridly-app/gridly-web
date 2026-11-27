import type { WarehouseView } from "@/domain/warehouse";
import { type ChangeEvent, useState } from "react";

import {
	confirmationLabels,
	type Order,
	type OrderInput,
	workflowKeys,
} from "@/domain/warehouse";

import { initialOrderForm, type OrderFormValues } from "./orderFormDrafts";
import { orderFromForm } from "./orderFromForm";

type FormLine = OrderFormValues["lines"][number];

type WorkflowKey = (typeof workflowKeys)[number];

export interface OrderFormOptions {
	kind: Order["kind"];
	order?: Order | undefined;
	warehouse: WarehouseView<"catalog" | "robots">;
	pending: boolean;
	onSave: (order: OrderInput) => Promise<void>;
	values?: OrderFormValues | undefined;
	onValuesChange?: ((values: OrderFormValues) => void) | undefined;
}

function orderLines(lines: FormLine[]) {
	return lines.map(({ id, product, quantity, expires }) => ({
		id,
		product,
		quantity: Number(quantity),
		expires,
	}));
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
	const confirmations = workflowKeys.map((key, index) => ({
		key,
		checked: current.manual[key],
		label: confirmationLabels[key],
		index,
	}));

	function update(next: OrderFormValues) {
		if (pending) return;

		if (onValuesChange) {
			onValuesChange(next);

			return;
		}

		setLocal(next);
	}

	function updateLine(key: string, patch: Partial<FormLine>) {
		update({
			...current,
			lines: current.lines.map((line) =>
				line.key === key ? { ...line, ...patch } : line,
			),
		});
	}

	function handleSubmit(data: FormData): Promise<void> {
		return onSave(
			orderFromForm(data, {
				kind,
				order,
				lines: orderLines(current.lines),
				manual: current.manual,
			}),
		);
	}

	function changeParty(event: ChangeEvent<HTMLInputElement>) {
		update({ ...current, party: event.target.value });
	}

	function changeProduct(key: string, product: string) {
		updateLine(key, { product });
	}

	function changeQuantity(key: string, event: ChangeEvent<HTMLInputElement>) {
		updateLine(key, { quantity: event.target.value });
	}

	function changeExpires(key: string, event: ChangeEvent<HTMLInputElement>) {
		updateLine(key, { expires: event.target.value });
	}

	function addLine() {
		const line = {
			key: crypto.randomUUID(),
			product: "",
			quantity: "1",
			expires: "",
		};

		update({ ...current, lines: [...current.lines, line] });
	}

	function removeLine(key: string) {
		update({
			...current,
			lines: current.lines.filter((line) => line.key !== key),
		});
	}

	function updateManual(key: WorkflowKey, checked: boolean) {
		update({ ...current, manual: { ...current.manual, [key]: checked } });
	}

	function resetManual() {
		update({ ...current, manual: { ...warehouse.policy } });
	}

	return {
		pending,
		order,
		kind,
		party: current.party,
		lines: current.lines,
		products: warehouse.products.filter((product) => !product.archived),
		confirmations,
		handleSubmit,
		changeParty,
		changeProduct,
		changeQuantity,
		changeExpires,
		addLine,
		removeLine,
		updateManual,
		resetManual,
	};
}
