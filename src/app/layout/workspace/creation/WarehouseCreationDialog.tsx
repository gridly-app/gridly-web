import type { WarehouseInput } from "@/entities/warehouse";
import { Input } from "@/shared/ui/controls";
import { Field, FormGrid, FormShell } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import type { useWarehouseCreation } from "./useWarehouseCreation";
import styles from "./WarehouseCreationDialog.module.css";
import { warehouseFromForm } from "./warehouseFromForm";

export interface WarehouseCreationDialogProps {
	model: ReturnType<typeof useWarehouseCreation>;
}

export function WarehouseCreationDialog({
	model,
}: WarehouseCreationDialogProps) {
	const { open, setOpen, pending, save } = model;

	return (
		<>
			{open && (
				<Modal title="Создание склада" onClose={() => setOpen(false)}>
					<CreateWarehouseForm pending={pending} onSave={save} />
				</Modal>
			)}
		</>
	);
}

interface CreateWarehouseFormProps {
	onSave: (warehouse: WarehouseInput) => Promise<void>;
	pending: boolean;
}

function CreateWarehouseForm({ onSave, pending }: CreateWarehouseFormProps) {
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
			<p className={styles.muted}>
				Будет создана пустая карта. Максимум 10 000 клеток.
			</p>
		</FormShell>
	);
}
