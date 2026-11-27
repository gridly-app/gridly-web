import type { ChangeEvent } from "react";

import { type Actual, transports } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto";
import {
	DateTime,
	ItemPicker,
	Quantity,
} from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

type ShipmentItem = WorkingShipment["items"][number];
type TextField =
	"packaging" | "vehicle_number" | "reference_number" | "comment";

const textFields = [
	{ key: "packaging", label: "Упаковка" },
	{ key: "vehicle_number", label: "Номер вагона / автомобиля" },
	{ key: "reference_number", label: "Номер рейса / накладной" },
	{ key: "comment", label: "Публичный комментарий" },
] as const satisfies ReadonlyArray<{ key: TextField; label: string }>;

const transportOptions = Object.entries(transports).map(([value, label]) => ({
	value,
	label,
}));

function isTransport(value: string): value is Actual["transport_type"] {
	return Object.hasOwn(transports, value);
}

export function ShipmentActualEditor({
	rows,
	items,
	isBusy,
	onEdit,
	onRemove,
	onAdd,
}: {
	rows: Actual[];
	items: WorkingShipment["items"];
	isBusy: boolean;
	onEdit: (id: string, patch: Partial<Actual>) => void;
	onRemove: (id: string) => void;
	onAdd: () => void;
}) {
	return (
		<>
			<h3>Факт отгрузки</h3>
			<p>Время в полях ниже указывается в UTC.</p>
			{rows.map((row, index) => (
				<ActualFields
					key={row.id}
					index={index}
					items={items}
					row={row}
					isBusy={isBusy}
					onEdit={onEdit}
					onRemove={onRemove}
				/>
			))}
			<Button
				type="button"
				variant="secondary"
				disabled={!items.length}
				onClick={onAdd}
			>
				Добавить факт
			</Button>
		</>
	);
}

function ActualFields({
	index,
	items,
	row,
	isBusy,
	onEdit,
	onRemove,
}: {
	index: number;
	items: WorkingShipment["items"];
	row: Actual;
	isBusy: boolean;
	onEdit: (id: string, patch: Partial<Actual>) => void;
	onRemove: (id: string) => void;
}) {
	function edit(patch: Partial<Actual>) {
		onEdit(row.id, patch);
	}

	function handleItemChange(item: ShipmentItem) {
		edit({
			order_line_id: item.order_line_id,
			unit: item.unit,
			packaging: item.packaging,
		});
	}

	function handleQuantityChange(quantity: number) {
		edit({ quantity });
	}

	function handleShippedAtChange(value: string | null) {
		edit({ shipped_at: value ?? "" });
	}

	function handleLoadedAtChange(loadedAt: string | null) {
		edit({ loaded_at: loadedAt });
	}

	function handleTransportChange(value: string) {
		if (isTransport(value)) edit({ transport_type: value });
	}

	function handleTextChange(
		key: TextField,
		event: ChangeEvent<HTMLInputElement>,
	) {
		edit({ [key]: event.target.value || null });
	}

	function handleRemove() {
		onRemove(row.id);
	}

	return (
		<fieldset className={styles.row}>
			<legend>Фактическая строка {index + 1}</legend>
			<ItemPicker
				isBusy={isBusy}
				items={items}
				value={row.order_line_id}
				onChange={handleItemChange}
			/>
			<Quantity
				unit={row.unit}
				value={row.quantity}
				onChange={handleQuantityChange}
			/>
			<DateTime
				label="Отгружено (UTC)"
				isRequired
				value={row.shipped_at}
				onChange={handleShippedAtChange}
			/>
			<DateTime
				label="Погружено (UTC)"
				value={row.loaded_at}
				onChange={handleLoadedAtChange}
			/>
			<div>
				<span>Тип перевозки</span>
				<Select
					aria-label="Тип перевозки"
					value={row.transport_type}
					disabled={isBusy}
					onValueChange={handleTransportChange}
					options={transportOptions}
				/>
			</div>
			{textFields.map(({ key, label }) => (
				<Field key={key} label={label}>
					<Input
						value={row[key] ?? ""}
						onChange={(event) => handleTextChange(key, event)}
					/>
				</Field>
			))}
			<Button type="button" variant="ghost" onClick={handleRemove}>
				Удалить строку факта
			</Button>
		</fieldset>
	);
}
