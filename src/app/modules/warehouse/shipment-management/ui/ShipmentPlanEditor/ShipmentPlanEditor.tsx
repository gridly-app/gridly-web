import type { Plan } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Field } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../model/shipment.dto.ts";
import type { ShipmentPlanRow } from "../../model/shipmentEditor";
import {
	ItemPicker,
	Quantity,
} from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

export function ShipmentPlanEditor({
	rows,
	items,
	busy,
	onEdit,
	onRemove,
	onAdd,
}: {
	rows: ShipmentPlanRow[];
	items: WorkingShipment["items"];
	busy: boolean;
	onEdit: (clientId: string, patch: Partial<Plan>) => void;
	onRemove: (clientId: string) => void;
	onAdd: () => void;
}) {
	return (
		<>
			<h3>План по датам</h3>
			{rows.map(({ clientId, entry }, index) => {
				function handleItemChange(item: WorkingShipment["items"][number]) {
					onEdit(clientId, {
						order_line_id: item.order_line_id,
						unit: item.unit,
					});
				}

				function handleQuantityChange(quantity: number) {
					onEdit(clientId, { quantity });
				}

				function handleRemove() {
					onRemove(clientId);
				}

				return (
					<fieldset className={styles.row} key={clientId}>
						<legend>Плановая строка {index + 1}</legend>
						<ItemPicker
							busy={busy}
							items={items}
							value={entry.order_line_id}
							onChange={handleItemChange}
						/>
						<Field label="Дата">
							<Input
								required
								type="date"
								value={entry.date}
								onChange={(event) =>
									onEdit(clientId, { date: event.target.value })
								}
							/>
						</Field>
						<Quantity
							unit={entry.unit}
							value={entry.quantity}
							change={handleQuantityChange}
						/>
						<Button type="button" variant="ghost" onClick={handleRemove}>
							Удалить строку плана
						</Button>
					</fieldset>
				);
			})}
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
