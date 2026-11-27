import { type FormEvent, type ReactNode, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";
import { useWarehouses } from "@/ports/warehouse";
import { type HttpClient, isStaleRevision } from "@/shared/http";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { managementStyles as styles } from "@/shared/ui/management";
import { Modal } from "@/shared/ui/overlays";

import {
	type EditableAccount,
	type Permission,
	userLoginMaxLength,
	userNameMaxLength,
	userProfileSchema,
} from "../../api/users.dto";
import { isForbidden, useUpdateAdminUser } from "../../api/usersApi";
import { userActionError } from "../../model/userActionError";
import { useWarehouseAccessDraft } from "../../model/useWarehouseAccessDraft";
import { WarehousePermissions } from "../WarehousePermissions/WarehousePermissions";

export function UserAccessEditor({
	http,
	user,
	permissions,
	manageableWarehouseIds,
	onClose,
	onSave,
	renderConflict,
}: {
	http: HttpClient;
	user: EditableAccount;
	permissions: Permission[] | undefined;
	manageableWarehouseIds: string[] | undefined;
	onClose: () => void;
	onSave: () => void;
	renderConflict: () => ReactNode;
}) {
	const warehouses = useWarehouses();
	const { initialAccess, assigned, hasAccessChanges, handleAccessChange } =
		useWarehouseAccessDraft(user.warehouses);
	const [fieldErrors, setFieldErrors] = useState({ name: "", login: "" });
	const mode = useWorkspaceMode();
	const mutation = useUpdateAdminUser(http, mode, user.id, onSave);
	const canEditProfile = user.allowed_actions.includes("edit-profile");
	const canEditAccess =
		user.allowed_actions.includes("edit-memberships") &&
		warehouses.isSuccess &&
		Boolean(permissions);
	const assignedWarehouses =
		warehouses.data?.filter(
			({ id }) => initialAccess.has(id) || manageableWarehouseIds?.includes(id),
		) ?? [];
	const hasConflict = isStaleRevision(mutation.error);
	const canSave =
		!hasConflict &&
		!isForbidden(mutation.error) &&
		!mutation.isPending &&
		(canEditProfile || (canEditAccess && hasAccessChanges));

	function handleClose() {
		if (!mutation.isPending) onClose();
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSave) return;

		const membership =
			canEditAccess && hasAccessChanges
				? { warehouses: [...assigned.values()] }
				: {};

		if (!canEditProfile) {
			mutation.mutate({ ...membership, revision: user.revision });

			return;
		}

		const data = new FormData(event.currentTarget);
		const name = userProfileSchema.shape.name.safeParse(data.get("name"));
		const login = userProfileSchema.shape.login.safeParse(data.get("login"));

		setFieldErrors({
			name: name.success ? "" : "Укажите имя пользователя.",
			login: login.success
				? ""
				: "Проверьте длину логина и допустимые символы.",
		});

		if (!name.success || !login.success) return;

		mutation.mutate({
			name: name.data,
			login: login.data,
			revision: user.revision,
			...membership,
		});
	}

	return (
		<Modal wide title={`Доступ · ${user.name}`} onClose={handleClose}>
			<form className={styles.form} method="post" onSubmit={handleSubmit}>
				{canEditProfile && (
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
				)}
				{warehouses.isPending && (
					<Feedback tone="loading">Загружаем склады…</Feedback>
				)}
				{warehouses.error && (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={warehouses.refetch} />}
					>
						{userActionError(warehouses.error)}
					</Feedback>
				)}
				{canEditAccess && permissions && (
					<WarehousePermissions
						warehouses={assignedWarehouses}
						assigned={assigned}
						permissions={permissions}
						disabled={mutation.isPending || !warehouses.isSuccess}
						onChange={handleAccessChange}
					/>
				)}
				{!permissions && user.allowed_actions.includes("edit-memberships") && (
					<Feedback tone="info">Каталог разрешений недоступен.</Feedback>
				)}
				{!canEditAccess && hasAccessChanges && (
					<Feedback tone="warning">
						Обновите данные о складах и разрешениях, чтобы сохранить изменения
						доступа.
					</Feedback>
				)}
				{hasConflict && renderConflict()}
				{mutation.error && !hasConflict && (
					<Feedback tone="error">{userActionError(mutation.error)}</Feedback>
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
