import { type Actual, transports } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto.ts";
import {
	DateTime,
	ItemPicker,
	Quantity,
} from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

export function ShipmentActualEditor({
	rows,
	items,
	busy,
	onEdit,
	onRemove,
	onAdd,
}: {
	rows: Actual[];
	items: WorkingShipment["items"];
	busy: boolean;
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
					busy={busy}
					row={row}
					edit={(patch) => onEdit(row.id, patch)}
					remove={() => onRemove(row.id)}
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
	busy,
	index,
	items,
	row,
	edit,
	remove,
}: {
	index: number;
	busy: boolean;
	items: WorkingShipment["items"];
	row: Actual;
	edit: (patch: Partial<Actual>) => void;
	remove: () => void;
}) {
	const fields = [
		["packaging", "Упаковка"],
		["vehicle_number", "Номер вагона / автомобиля"],
		["reference_number", "Номер рейса / накладной"],
		["comment", "Публичный комментарий"],
	] as const;
	return (
		<fieldset className={styles.row}>
			<legend>Фактическая строка {index + 1}</legend>
			<ItemPicker
				busy={busy}
				items={items}
				value={row.order_line_id}
				onChange={(item) =>
					edit({
						order_line_id: item.order_line_id,
						unit: item.unit,
						packaging: item.packaging,
					})
				}
			/>
			<Quantity
				unit={row.unit}
				value={row.quantity}
				change={(quantity) => edit({ quantity })}
			/>
			<DateTime
				label="Отгружено (UTC)"
				required
				value={row.shipped_at}
				change={(value) => edit({ shipped_at: value ?? "" })}
			/>
			<DateTime
				label="Погружено (UTC)"
				value={row.loaded_at}
				change={(loaded_at) => edit({ loaded_at })}
			/>
			<div>
				<span>Тип перевозки</span>
				<Select
					aria-label="Тип перевозки"
					value={row.transport_type}
					disabled={busy}
					onValueChange={(value) => {
						if (value === "road" || value === "rail")
							edit({ transport_type: value });
					}}
					options={Object.entries(transports).map(([value, label]) => ({
						value,
						label,
					}))}
				/>
			</div>
			{fields.map(([key, label]) => (
				<Field key={key} label={label}>
					<Input
						value={row[key] ?? ""}
						onChange={(event) => edit({ [key]: event.target.value || null })}
					/>
				</Field>
			))}
			<Button type="button" variant="ghost" onClick={remove}>
				Удалить строку факта
			</Button>
		</fieldset>
	);
}
