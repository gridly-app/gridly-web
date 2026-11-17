import { type FormEvent, type ReactNode, useState } from "react";

import { useWarehouses } from "@/ports/warehouse";
import { useWorkspaceMode } from "@/ports/session";

import { type FetchHttpClient, isStaleRevision } from "@/shared/http";
import { useUpdateAdminUser } from "../../api/usersApi";

import {
	accountUserUpdateSchema,
	type EditableAccount,
	type Permission,
	userLoginMaxLength,
	userNameMaxLength,
} from "../../api/users.dto";

import { errorMessage } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";

import { WarehousePermissions } from "../WarehousePermissions/WarehousePermissions";

import { managementStyles as styles } from "@/shared/ui/management";

export function UserAccessEditor({
	http,
	user,
	permissions,
	onClose,
	onSave,
	renderConflict,
}: {
	http: FetchHttpClient;
	user: EditableAccount;
	permissions: Permission[] | undefined;
	onClose: () => void;
	onSave: () => void;
	renderConflict: () => ReactNode;
}) {
	const warehouses = useWarehouses();
	const [initialAccess] = useState(
		() => new Map(user.warehouses.map((entry) => [entry.warehouse_id, entry])),
	);
	const [assigned, setAssigned] = useState(initialAccess);
	const [fieldErrors, setFieldErrors] = useState({ name: "", login: "" });
	const mode = useWorkspaceMode();
	const mutation = useUpdateAdminUser(http, mode, user.id, onSave);
	const canEditAccess = warehouses.isSuccess && Boolean(permissions);
	const hasAccessChanges = !samePermissions(initialAccess, assigned);
	const hasConflict = isStaleRevision(mutation.error);
	const canSave =
		!hasConflict && !mutation.isPending && (canEditAccess || !hasAccessChanges);

	function handleClose() {
		if (!mutation.isPending) onClose();
	}

	function handleAccessChange(id: string, name: string, codes: string[]) {
		setAssigned((current) => updateWarehouseAccess(current, id, name, codes));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSave) return;

		const data = new FormData(event.currentTarget);
		const name = accountUserUpdateSchema.shape.name.safeParse(data.get("name"));
		const login = accountUserUpdateSchema.shape.login.safeParse(
			data.get("login"),
		);

		setFieldErrors({
			name: name.success ? "" : "Укажите имя пользователя.",
			login: login.success ? "" : "Укажите логин пользователя.",
		});

		if (!name.success || !login.success) return;

		mutation.mutate({
			name: name.data,
			login: login.data,
			revision: user.revision,
			warehouses: [...assigned.values()],
		});
	}

	return (
		<Modal wide title={`Доступ · ${user.name}`} onClose={handleClose}>
			<form className={styles.form} method="post" onSubmit={handleSubmit}>
				<div className={styles.editorColumns}>
					<Field label="Имя" error={fieldErrors.name}>
						<Input
							name="name"
							required
							maxLength={userNameMaxLength}
							disabled={mutation.isPending}
							defaultValue={user.name}
						/>
					</Field>
					<Field label="Логин" error={fieldErrors.login}>
						<Input
							name="login"
							required
							maxLength={userLoginMaxLength}
							disabled={mutation.isPending}
							defaultValue={user.login}
						/>
					</Field>
				</div>
				{warehouses.isPending && (
					<Feedback tone="loading">Загружаем склады…</Feedback>
				)}
				{warehouses.error && (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={warehouses.refetch} />}
					>
						{errorMessage(warehouses.error)}
					</Feedback>
				)}
				{permissions ? (
					<WarehousePermissions
						warehouses={warehouses.data ?? []}
						assigned={assigned}
						permissions={permissions}
						disabled={mutation.isPending || !warehouses.isSuccess}
						onChange={handleAccessChange}
					/>
				) : (
					<Feedback tone="info">
						Каталог разрешений недоступен. Можно изменить имя и логин.
					</Feedback>
				)}
				{!canEditAccess && hasAccessChanges && (
					<Feedback tone="warning">
						Обновите данные о складах и разрешениях, чтобы сохранить изменения
						доступа.
					</Feedback>
				)}
				{hasConflict && renderConflict()}
				{mutation.error && !hasConflict && (
					<Feedback tone="error">{errorMessage(mutation.error)}</Feedback>
				)}
				<div className={styles.actions}>
					<Button
						variant="secondary"
						onClick={handleClose}
						disabled={mutation.isPending}
					>
						Отмена
					</Button>
					<Button type="submit" disabled={!canSave}>
						Сохранить пользователя
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function samePermissions(
	initial: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
	assigned: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
) {
	if (initial.size !== assigned.size) return false;

	for (const [id, { permissions }] of initial) {
		const current = assigned.get(id)?.permissions;

		if (current?.length !== permissions.length) return false;
		if (permissions.some((code) => !current.includes(code))) return false;
	}

	return true;
}

function updateWarehouseAccess(
	current: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
	id: string,
	name: string,
	codes: string[],
) {
	const next = new Map(current);

	if (!codes.length) {
		next.delete(id);

		return next;
	}

	next.set(id, { warehouse_id: id, warehouse_name: name, permissions: codes });

	return next;
}
