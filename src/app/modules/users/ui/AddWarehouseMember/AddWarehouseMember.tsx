import { type FormEvent, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";
import { useWarehouses } from "@/ports/warehouse";
import type { HttpClient } from "@/shared/http";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { managementStyles as styles } from "@/shared/ui/management";
import { Modal } from "@/shared/ui/overlays";

import {
	assignmentSchema,
	type EditableAccount,
	type Permission,
	userLoginMaxLength,
} from "../../api/users.dto";
import { isForbidden, useAddWarehouseMember } from "../../api/usersApi";
import { userActionError } from "../../model/userActionError";
import { WarehousePermissions } from "../WarehousePermissions/WarehousePermissions";

export function AddWarehouseMember({
	http,
	permissions,
	warehouseIds,
	onClose,
	onAdded,
}: {
	http: HttpClient;
	permissions: Permission[];
	warehouseIds: string[] | undefined;
	onClose: () => void;
	onAdded: () => void;
}) {
	const mode = useWorkspaceMode();
	const query = useWarehouses();
	const mutation = useAddWarehouseMember(http, mode, onAdded);
	const [access, setAccess] = useState<EditableAccount["warehouses"][number]>();
	const [error, setError] = useState("");
	const warehouses =
		query.data?.filter(
			({ id }) => !warehouseIds || warehouseIds.includes(id),
		) ?? [];
	const assigned = new Map(access ? [[access.warehouse_id, access]] : []);
	const isSubmitting = mutation.isPending;
	const canEdit = !isSubmitting && !isForbidden(mutation.error);
	const canSubmit = canEdit && Boolean(access?.permissions.length);
	const submitError =
		error || (mutation.error ? userActionError(mutation.error) : "");

	function handleClose() {
		if (!isSubmitting) onClose();
	}

	function handleAccessChange(id: string, name: string, permissions: string[]) {
		setAccess({ warehouse_id: id, warehouse_name: name, permissions });
	}

	function handleWarehouseChange() {
		setAccess(undefined);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSubmit) return;

		const login = new FormData(event.currentTarget).get("login");
		const result = assignmentSchema.safeParse({ ...access, login });

		if (!result.success) {
			setError("Укажите логин и разрешения участника.");

			return;
		}

		setError("");
		mutation.mutate(result.data);
	}

	return (
		<Modal wide title="Добавить участника на склад" onClose={handleClose}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<Field label="Логин существующего аккаунта">
					<Input
						name="login"
						required
						maxLength={userLoginMaxLength}
						disabled={!canEdit}
					/>
				</Field>
				<WarehousePermissions
					warehouses={warehouses}
					assigned={assigned}
					permissions={permissions}
					disabled={!canEdit}
					onChange={handleAccessChange}
					onWarehouseChange={handleWarehouseChange}
				/>
				{query.error && (
					<Feedback tone="error">{userActionError(query.error)}</Feedback>
				)}
				{query.isSuccess && !warehouses.length && (
					<Feedback tone="info">Нет доступных складов.</Feedback>
				)}
				{submitError && <Feedback tone="error">{submitError}</Feedback>}
				<Button type="submit" disabled={!canSubmit}>
					Добавить участника
				</Button>
			</form>
		</Modal>
	);
}
