import { formatUnit } from "@/domain/shipment";
import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto.ts";

export function ItemPicker({
	busy,
	items,
	value,
	onChange,
}: {
	items: WorkingShipment["items"];
	busy: boolean;
	value: string;
	onChange: (item: WorkingShipment["items"][number]) => void;
}) {
	return (
		<div>
			<span>Номенклатура</span>
			<Select
				aria-label="Номенклатура"
				value={value}
				disabled={busy}
				onValueChange={(id) => {
					const item = items.find(({ order_line_id }) => order_line_id === id);
					if (item) onChange(item);
				}}
				options={items.map((item) => ({
					value: item.order_line_id,
					label: `${item.sku} · ${item.name}`,
				}))}
				searchable
			/>
		</div>
	);
}

export function Quantity({
	unit,
	value,
	change,
}: {
	unit: string;
	value: number;
	change: (quantity: number) => void;
}) {
	return (
		<Field label={`Количество (${formatUnit(unit)})`}>
			<Input
				required
				type="number"
				step="any"
				min="0"
				value={Number.isNaN(value) ? "" : value}
				onChange={(event) => change(event.target.valueAsNumber)}
			/>
		</Field>
	);
}

export function DateTime({
	label,
	value,
	change,
	required,
	disabled,
}: {
	label: string;
	value: string | null;
	change: (value: string | null) => void;
	required?: boolean;
	disabled?: boolean;
}) {
	return (
		<Field label={label}>
			<Input
				type="datetime-local"
				step="1"
				required={required}
				disabled={disabled}
				value={toUtcDateTimeInput(value)}
				onChange={(event) => change(parseUtcDateTimeInput(event.target.value))}
			/>
		</Field>
	);
}
