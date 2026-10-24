import type { ChangeEvent } from "react";
import { useState } from "react";
import type { Order, Warehouse } from "@/entities/warehouse";
import { confirmationLabels } from "@/entities/warehouse";
import { id } from "@/shared/lib";
import { orderFromForm } from "./orderFromForm";

export interface OrderFormOptions {
	kind: Order["kind"];
	order?: Order;
	warehouse: Warehouse;
	pending: boolean;
	onSave: (order: Order) => Promise<void>;
}

export interface OrderFormLine {
	key: string;
	value: Order["lines"][number];
}

export function useOrderForm({
	kind,
	order,
	warehouse,
	pending,
	onSave,
}: OrderFormOptions) {
	const [lines, setLines] = useState<OrderFormLine[]>(() =>
		(
			order?.lines || [
				{
					product:
						warehouse.products.find((product) => !product.archived)?.id || "",
					quantity: 1,
					expires: "",
				},
			]
		).map((value) => ({ key: id(), value })),
	);
	const [manual, setManual] = useState(order?.manual || warehouse.policy);

	function handleSubmit(data: FormData): Promise<void> {
		return onSave(
			orderFromForm(data, {
				kind,
				order,
				warehouse,
				lines: lines.map((line) => line.value),
				manual,
			}),
		);
	}

	function updateLine(key: string, patch: Partial<Order["lines"][number]>) {
		setLines((current) =>
			current.map((line) =>
				line.key === key
					? { ...line, value: { ...line.value, ...patch } }
					: line,
			),
		);
	}

	function addLine() {
		const line: OrderFormLine = {
			key: id(),
			value: { product: "", quantity: 1, expires: "" },
		};

		setLines((current) => [...current, line]);
	}

	function removeLine(key: string) {
		setLines((current) => current.filter((line) => line.key !== key));
	}

	function updateManual(index: number, checked: boolean) {
		setManual((current) =>
			current.map((value, stageIndex) =>
				index === stageIndex ? checked : value,
			),
		);
	}

	function resetManual() {
		setManual(warehouse.policy);
	}

	function changeProduct(key: string, product: string) {
		updateLine(key, { product });
	}

	function changeQuantity(key: string, event: ChangeEvent<HTMLInputElement>) {
		updateLine(key, { quantity: Number(event.target.value) });
	}

	function changeExpires(key: string, event: ChangeEvent<HTMLInputElement>) {
		updateLine(key, { expires: event.target.value });
	}

	const products = warehouse.products.filter((product) => !product.archived);

	const fields = lines.map(({ key, value }) => ({
		...value,
		key,
	}));
	const confirmations = manual.map((checked, index) => ({
		checked,
		label: confirmationLabels[index],
		index,
	}));

	return {
		pending,
		order,
		handleSubmit,
		kind,
		lines: fields,
		confirmations,
		products,
		changeProduct,
		changeQuantity,
		changeExpires,
		addLine,
		removeLine,
		updateManual,
		resetManual,
	};
}
