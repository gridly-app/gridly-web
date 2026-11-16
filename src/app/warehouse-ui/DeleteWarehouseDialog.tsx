import { useRef, useState } from "react";
import type { Warehouse } from "@/domain/warehouse";
import { useWarehouseCommand } from "@/ports/warehouse";
import { errorMessage, useOnlineStatus } from "@/shared/lib";
import { ConfirmDialog } from "@/shared/ui/overlays";

export function DeleteWarehouseDialog({
	warehouse,
	onDeleted,
	onCancel,
}: {
	warehouse: Warehouse;
	onDeleted: () => void;
	onCancel: () => void;
}) {
	const mutation = useWarehouseCommand(warehouse.id, warehouse);
	const online = useOnlineStatus();
	const submitting = useRef(false);
	const [error, setError] = useState("");

	async function confirm() {
		if (submitting.current) return;
		if (!online) {
			setError("Нет соединения. Подключитесь к сети и попробуйте ещё раз.");
			return;
		}
		if (
			!warehouse.allowedActions?.includes("delete") ||
			warehouse.revision === undefined
		) {
			setError("Удаление этого склада недоступно.");
			return;
		}
		submitting.current = true;
		setError("");
		try {
			await mutation.mutateAsync({ action: "deleteWarehouse" });
		} catch (failure) {
			setError(errorMessage(failure));
			return;
		} finally {
			submitting.current = false;
		}
		onDeleted();
	}

	return (
		<ConfirmDialog
			open
			title="Удалить склад?"
			description={`Склад «${warehouse.name}» и его данные будут удалены. Это действие нельзя отменить.`}
			confirmLabel="Удалить склад"
			pending={mutation.isPending}
			error={error}
			onCancel={onCancel}
			onConfirm={confirm}
		/>
	);
}
