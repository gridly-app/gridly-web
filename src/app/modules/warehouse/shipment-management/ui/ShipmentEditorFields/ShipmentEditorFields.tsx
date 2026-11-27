import type { ChangeEvent } from "react";

import { formatUnit } from "@/domain/shipment";
import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto";

type ShipmentItem = WorkingShipment["items"][number];

export function ItemPicker({
	items,
	value,
	isBusy,
	onChange,
}: {
	items: WorkingShipment["items"];
	value: string;
	isBusy: boolean;
	onChange: (item: ShipmentItem) => void;
}) {
	const options = items.map((item) => ({
		value: item.order_line_id,
		label: `${item.sku} · ${item.name}`,
	}));

	function handleValueChange(id: string) {
		const item = items.find(({ order_line_id }) => order_line_id === id);

		if (item) onChange(item);
	}

	return (
		<div>
			<span>Номенклатура</span>
			<Select
				aria-label="Номенклатура"
				value={value}
				disabled={isBusy}
				onValueChange={handleValueChange}
				options={options}
				searchable
			/>
		</div>
	);
}

export function Quantity({
	unit,
	value,
	onChange,
}: {
	unit: string;
	value: number;
	onChange: (quantity: number) => void;
}) {
	const inputValue = Number.isNaN(value) ? "" : value;

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(event.target.valueAsNumber);
	}

	return (
		<Field label={`Количество (${formatUnit(unit)})`}>
			<Input
				required
				type="number"
				step="any"
				min="0"
				value={inputValue}
				onChange={handleChange}
			/>
		</Field>
	);
}

export function DateTime({
	label,
	value,
	isRequired,
	isDisabled,
	onChange,
}: {
	label: string;
	value: string | null;
	isRequired?: boolean;
	isDisabled?: boolean;
	onChange: (value: string | null) => void;
}) {
	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(parseUtcDateTimeInput(event.target.value));
	}

	return (
		<Field label={label}>
			<Input
				type="datetime-local"
				step="1"
				required={isRequired}
				disabled={isDisabled}
				value={toUtcDateTimeInput(value)}
				onChange={handleChange}
			/>
		</Field>
	);
}
