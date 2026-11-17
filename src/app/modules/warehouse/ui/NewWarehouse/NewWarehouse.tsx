import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WarehouseInput } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useCreateWarehouse } from "@/ports/warehouse";
import { UserError, useOnlineStatus } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Field, FormGrid, FormShell } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import styles from "./NewWarehouse.module.css";
import {
	warehouseFormLimits,
	warehouseFromForm,
} from "../../model/workspace/creation/warehouseFromForm";

export function NewWarehouse() {
	const [open, setOpen] = useState(true);
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const creation = useCreateWarehouse();
	const online = useOnlineStatus();

	async function save(input: WarehouseInput) {
		if (!navigator.onLine) {
			throw new UserError("Для создания склада нужно соединение с сервером");
		}
		const added = await creation.mutateAsync(input);
		await navigate(warehousePath(mode, added.id));
	}

	return (
		<>
			<Button onClick={() => setOpen(true)}>Создать первый склад</Button>
			{open && (
				<Modal title="Создание склада" onClose={() => setOpen(false)}>
					<CreateWarehouseForm
						pending={creation.isPending || !online}
						onSave={save}
					/>
				</Modal>
			)}
		</>
	);
}

function CreateWarehouseForm({
	onSave,
	pending,
}: {
	onSave: (warehouse: WarehouseInput) => Promise<void>;
	pending: boolean;
}) {
	const { minSize, maxSize, maxNameLength } = warehouseFormLimits;
	return (
		<FormShell
			pending={pending}
			onSubmit={(data) => onSave(warehouseFromForm(data))}
		>
			<Field label="Название *">
				<Input name="name" required maxLength={maxNameLength} />
			</Field>
			<FormGrid>
				<Field label="Ширина *">
					<Input
						name="width"
						type="number"
						defaultValue={12}
						min={minSize}
						max={maxSize}
						required
					/>
				</Field>
				<Field label="Высота *">
					<Input
						name="height"
						type="number"
						defaultValue={10}
						min={minSize}
						max={maxSize}
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
