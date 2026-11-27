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

import {
	warehouseFormLimits,
	warehouseFromForm,
} from "../../model/warehouseFromForm";

import styles from "./NewWarehouse.module.css";

const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 10;

export function NewWarehouse() {
	const [isOpen, setIsOpen] = useState(true);
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const creation = useCreateWarehouse();
	const isOnline = useOnlineStatus();

	async function handleSave(input: WarehouseInput) {
		if (!isOnline)
			throw new UserError("Для создания склада нужно соединение с сервером");

		const warehouse = await creation.mutateAsync(input);

		await navigate(warehousePath(mode, warehouse.id));
	}

	function handleOpen() {
		setIsOpen(true);
	}

	function handleClose() {
		setIsOpen(false);
	}

	return (
		<>
			<Button onClick={handleOpen}>Создать первый склад</Button>
			{isOpen && (
				<Modal title="Создание склада" onClose={handleClose}>
					<CreateWarehouseForm
						isPending={creation.isPending || !isOnline}
						onSave={handleSave}
					/>
				</Modal>
			)}
		</>
	);
}

function CreateWarehouseForm({
	isPending,
	onSave,
}: {
	isPending: boolean;
	onSave: (warehouse: WarehouseInput) => Promise<void>;
}) {
	const { minSize, maxSize, maxNameLength } = warehouseFormLimits;
	const maxCells = (maxSize * maxSize).toLocaleString("ru-RU");

	function handleSubmit(data: FormData) {
		return onSave(warehouseFromForm(data));
	}

	return (
		<FormShell pending={isPending} onSubmit={handleSubmit}>
			<Field label="Название *">
				<Input name="name" required maxLength={maxNameLength} />
			</Field>
			<FormGrid>
				<Field label="Ширина *">
					<Input
						name="width"
						type="number"
						defaultValue={DEFAULT_WIDTH}
						min={minSize}
						max={maxSize}
						required
					/>
				</Field>
				<Field label="Высота *">
					<Input
						name="height"
						type="number"
						defaultValue={DEFAULT_HEIGHT}
						min={minSize}
						max={maxSize}
						required
					/>
				</Field>
			</FormGrid>
			<p className={styles.hint}>
				Будет создана пустая карта. Максимум {maxCells} клеток.
			</p>
		</FormShell>
	);
}
