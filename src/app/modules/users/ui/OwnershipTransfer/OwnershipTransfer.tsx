import { type FormEvent, useState } from "react";

import type { WorkspaceMode } from "@/ports/session";
import type { HttpClient } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/forms";
import { managementStyles as styles } from "@/shared/ui/management";
import { Modal } from "@/shared/ui/overlays";

import type { EditableAccount } from "../../api/users.dto";
import { isForbidden, useTransferWarehouseOwner } from "../../api/usersApi";
import { userActionError } from "../../model/userActionError";

function transferableWarehouses(
	owner: EditableAccount,
	warehouseId: string | undefined,
) {
	if (!warehouseId) return owner.warehouses;

	return owner.warehouses.filter(
		({ warehouse_id }) => warehouse_id === warehouseId,
	);
}

function initialWarehouseId(warehouses: EditableAccount["warehouses"]) {
	const owned = warehouses.find(({ is_owner }) => is_owner);

	return (owned ?? warehouses[0])?.warehouse_id ?? "";
}

export function OwnershipTransfer({
	http,
	mode,
	owner,
	warehouseId,
	accounts,
	onBack,
	onTransferred,
}: {
	http: HttpClient;
	mode: WorkspaceMode;
	owner: EditableAccount;
	warehouseId: string | undefined;
	accounts: EditableAccount[];
	onBack: () => void;
	onTransferred: () => void;
}) {
	const warehouses = transferableWarehouses(owner, warehouseId);
	const [selectedWarehouseId, setSelectedWarehouseId] = useState(() =>
		initialWarehouseId(warehouses),
	);
	const [newOwnerId, setNewOwnerId] = useState("");
	const transfer = useTransferWarehouseOwner(http, mode, onTransferred);
	const warehouseOptions = warehouses.map(
		({ warehouse_id, warehouse_name }) => ({
			value: warehouse_id,
			label: warehouse_name,
		}),
	);
	const candidates = accounts.filter(
		(account) =>
			account.id !== owner.id &&
			account.warehouses.some(
				({ warehouse_id }) => warehouse_id === selectedWarehouseId,
			),
	);
	const candidateOptions = candidates.map(({ id, name, login }) => ({
		value: id,
		label: `${name} (${login})`,
	}));
	const isSubmitting = transfer.isPending;
	const canEdit = !isSubmitting && !isForbidden(transfer.error);
	const hasCandidate = candidates.some(({ id }) => id === newOwnerId);
	const canSubmit = canEdit && hasCandidate;

	function handleBack() {
		if (!isSubmitting) onBack();
	}

	function handleWarehouseChange(id: string) {
		setSelectedWarehouseId(id);
		setNewOwnerId("");
		transfer.reset();
	}

	function handleOwnerChange(id: string) {
		setNewOwnerId(id);
		transfer.reset();
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSubmit) return;

		transfer.mutate({ warehouseId: selectedWarehouseId, userId: newOwnerId });
	}

	return (
		<Modal title="Передать владение складом" onClose={handleBack}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<p>
					Пользователь «{owner.name}» владеет складом. Выберите участника
					склада, который станет новым владельцем.
				</p>
				{warehouseOptions.length > 1 && (
					<Field label="Склад">
						<Select
							aria-label="Склад"
							value={selectedWarehouseId}
							options={warehouseOptions}
							disabled={!canEdit}
							onValueChange={handleWarehouseChange}
						/>
					</Field>
				)}
				{candidateOptions.length > 0 && (
					<Field label="Новый владелец">
						<Select
							aria-label="Новый владелец"
							value={newOwnerId}
							options={candidateOptions}
							disabled={!canEdit}
							searchable
							onValueChange={handleOwnerChange}
						/>
					</Field>
				)}
				{candidateOptions.length === 0 && (
					<Feedback tone="info">
						На складе нет других участников. Сначала добавьте участника, затем
						передайте ему владение.
					</Feedback>
				)}
				{transfer.error && (
					<Feedback tone="error">{userActionError(transfer.error)}</Feedback>
				)}
				<div className={styles.actions}>
					<Button
						variant="secondary"
						disabled={isSubmitting}
						onClick={handleBack}
					>
						Назад
					</Button>
					<Button type="submit" disabled={!canSubmit}>
						Передать владение
					</Button>
				</div>
			</form>
		</Modal>
	);
}
