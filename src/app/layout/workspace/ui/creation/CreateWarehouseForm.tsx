import type { WarehouseInput } from "@/entities/warehouse";
import { Field, FormGrid, FormShell, Input } from "@/shared/ui";
import { warehouseFromForm } from "../../model/creation/warehouseFromForm";
import localLayout from "./Layout.module.css";

export interface CreateWarehouseFormProps {
	onSave: (warehouse: WarehouseInput) => Promise<void>;
	pending: boolean;
}

export function CreateWarehouseForm({
	onSave,
	pending,
}: CreateWarehouseFormProps) {
	return (
		<FormShell
			pending={pending}
			onSubmit={(data) => onSave(warehouseFromForm(data))}
		>
			<Field label="Название *">
				<Input name="name" required maxLength={80} />
			</Field>
			<FormGrid>
				<Field label="Ширина *">
					<Input
						name="width"
						type="number"
						defaultValue={12}
						min={2}
						max={100}
						required
					/>
				</Field>
				<Field label="Высота *">
					<Input
						name="height"
						type="number"
						defaultValue={10}
						min={2}
						max={100}
						required
					/>
				</Field>
			</FormGrid>
			<p className={localLayout.muted}>
				Будет создана пустая карта. Максимум 10 000 клеток.
			</p>
		</FormShell>
	);
}
