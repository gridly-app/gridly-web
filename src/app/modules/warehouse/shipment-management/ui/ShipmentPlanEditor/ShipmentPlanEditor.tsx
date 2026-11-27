import type { ChangeEvent } from "react";

import type { Plan } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Field } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto";
import type { ShipmentPlanRow } from "../../model/shipmentEditor";
import {
	ItemPicker,
	Quantity,
} from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

export function ShipmentPlanEditor({
	rows,
	items,
	isBusy,
	onEdit,
	onRemove,
	onAdd,
}: {
	rows: ShipmentPlanRow[];
	items: WorkingShipment["items"];
	isBusy: boolean;
	onEdit: (clientId: string, patch: Partial<Plan>) => void;
	onRemove: (clientId: string) => void;
	onAdd: () => void;
}) {
	return (
		<>
			<h3>План по датам</h3>
			{rows.map((row, index) => (
				<PlanFields
					key={row.clientId}
					index={index}
					row={row}
					items={items}
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
				Добавить план
			</Button>
		</>
	);
}

function PlanFields({
	index,
	row: { clientId, entry },
	items,
	isBusy,
	onEdit,
	onRemove,
}: {
	index: number;
	row: ShipmentPlanRow;
	items: WorkingShipment["items"];
	isBusy: boolean;
	onEdit: (clientId: string, patch: Partial<Plan>) => void;
	onRemove: (clientId: string) => void;
}) {
	function handleItemChange(item: WorkingShipment["items"][number]) {
		onEdit(clientId, { order_line_id: item.order_line_id, unit: item.unit });
	}

	function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
		onEdit(clientId, { date: event.target.value });
	}

	function handleQuantityChange(quantity: number) {
		onEdit(clientId, { quantity });
	}

	function handleRemove() {
		onRemove(clientId);
	}

	return (
		<fieldset className={styles.row}>
			<legend>Плановая строка {index + 1}</legend>
			<ItemPicker
				isBusy={isBusy}
				items={items}
				value={entry.order_line_id}
				onChange={handleItemChange}
			/>
			<Field label="Дата">
				<Input
					required
					type="date"
					value={entry.date}
					onChange={handleDateChange}
				/>
			</Field>
			<Quantity
				unit={entry.unit}
				value={entry.quantity}
				onChange={handleQuantityChange}
			/>
			<Button type="button" variant="ghost" onClick={handleRemove}>
				Удалить строку плана
			</Button>
		</fieldset>
	);
}
