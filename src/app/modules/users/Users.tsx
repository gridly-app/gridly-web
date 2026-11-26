import { useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { type HttpClient, isAccessDenied } from "@/shared/http";
import { useAdminUsers } from "./api/usersApi";

import { adminLocation } from "@/ports/navigation";
import {
	type EditableAccount,
	type AuditUser,
	type Permission,
	isEditableAccount,
} from "./api/users.dto";
import {
	defaultUserFilters,
	filterAdminUsers,
	userWarehouseOptions,
} from "./model/userFilters";

import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { AddWarehouseMember } from "./ui/AddWarehouseMember/AddWarehouseMember";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";

import { UsersFilters } from "./ui/UsersFilters/UsersFilters";
import { managementStyles as styles } from "@/shared/ui/management";
import { UsersTable } from "./ui/UsersTable/UsersTable";
import localStyles from "./Users.module.css";
import { UserAccessEditor } from "./ui/UserAccessEditor/UserAccessEditor";

import { UserAccessConflict } from "./ui/UserAccessConflict/UserAccessConflict";
import { UserRemovalDialog } from "./ui/UserRemovalDialog/UserRemovalDialog";

const emptyPermissions: Permission[] = [];
const emptyUsers: AuditUser[] = [];

export function Users({
	http,
	userId,
	userKind,
}: {
	http: HttpClient;
	userId: string | null;
	userKind: AuditUser["kind"] | undefined;
}) {
	const [action, setAction] = useState<{
		type: "edit" | "delete";
		user: EditableAccount;
		warehouseId?: string | undefined;
	} | null>(null);
	const [adding, setAdding] = useState(false);
	const editing = action?.type === "edit" ? action.user : null;
	const deleting = action?.type === "delete" ? action.user : null;
	const warehouseId =
		action?.type === "delete" ? action.warehouseId : undefined;
	const [notice, setNotice] = useState<{
		text: string;
		tone: "success" | "info";
	} | null>(null);
	const [filters, setFilters] = useState(defaultUserFilters);
	const mode = useWorkspaceMode();
	const query = useAdminUsers(http, mode);
	const isDenied = isAccessDenied(query.error);
	const data = isDenied ? undefined : query.data;
	const users = data?.items ?? emptyUsers;
	const catalog = data?.permission_catalog;
	const permissions = catalog ?? emptyPermissions;
	const canAdd =
		!!catalog && !!data?.allowed_actions.includes("add-warehouse-member");
	const hasRefreshError = !!data && !!query.error;
	const rows = filterAdminUsers(users, filters, permissions, userId, userKind);
	const locations = userWarehouseOptions(users);
	const latest = users.find(
		(user) => editing?.id === user.id && isEditableAccount(user),
	);
	const replacement =
		latest && isEditableAccount(latest) && latest.revision !== editing?.revision
			? latest
			: null;

	function handleEdit(user: EditableAccount) {
		setNotice(null);
		setAction({ type: "edit", user });
	}

	function handleDelete(user: EditableAccount, warehouseId?: string) {
		setNotice(null);
		setAction({ type: "delete", user, warehouseId });
	}

	function handleCloseEditor() {
		setAction(null);
	}

	function handleRestartEdit() {
		if (replacement) setAction({ type: "edit", user: replacement });
	}

	function renderConflict() {
		return (
			<UserAccessConflict
				replacement={replacement}
				readError={query.error}
				isUnavailable={query.isSuccess && !latest}
				onRefresh={query.refetch}
				onRestart={handleRestartEdit}
			/>
		);
	}

	function handleRemoved(warehouseId: string | undefined) {
		setAction(null);
		setNotice({
			text: warehouseId ? "Доступ к складу отозван." : "Аккаунт деактивирован.",
			tone: "success",
		});
	}

	function handleReplaceRemoval(user: EditableAccount) {
		setAction({ type: "delete", user, warehouseId });
	}

	function handleRemovalUnavailable() {
		setAction(null);
		setNotice({
			text: "Действие для этого пользователя больше недоступно.",
			tone: "info",
		});
	}

	function handleSave() {
		setAction(null);
		setNotice({ text: "Данные пользователя сохранены.", tone: "success" });
	}

	function handleOpenAdd() {
		setNotice(null);
		setAdding(true);
	}

	function handleCloseAdd() {
		setAdding(false);
	}

	function handleAdded() {
		setAdding(false);
		setNotice({ text: "Участник добавлен на склад.", tone: "success" });
	}

	const latestActions =
		latest && isEditableAccount(latest) ? latest.allowed_actions : [];
	const canEditLatest = latestActions.some((permission) =>
		["edit-profile", "edit-memberships"].includes(permission),
	);

	return (
		<section className={styles.panel} aria-label="Пользователи">
			<div className={`${styles.toolbar} ${localStyles.toolbar}`}>
				<UsersFilters
					filters={filters}
					locations={locations}
					onChange={setFilters}
				/>
				{canAdd && (
					<Button className={localStyles.add} onClick={handleOpenAdd}>
						Добавить участника на склад
					</Button>
				)}
			</div>
			{adding && canAdd && catalog && (
				<AddWarehouseMember
					http={http}
					permissions={catalog}
					warehouseIds={data?.manageable_warehouse_ids}
					onClose={handleCloseAdd}
					onAdded={handleAdded}
				/>
			)}
			{userId && (
				<Link className={styles.link} to={adminLocation("users")}>
					Показать всех пользователей
				</Link>
			)}
			{query.isPending && (
				<Feedback tone="loading">Загружаем пользователей…</Feedback>
			)}
			{query.error && !hasRefreshError && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{hasRefreshError && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={query.refetch} />}
				>
					Не удалось обновить список. Показаны последние загруженные данные.
				</Feedback>
			)}
			{notice && <Feedback tone={notice.tone}>{notice.text}</Feedback>}
			{editing && canEditLatest && (
				<UserAccessEditor
					key={editing.revision}
					http={http}
					user={{ ...editing, allowed_actions: latestActions }}
					permissions={catalog}
					manageableWarehouseIds={data?.manageable_warehouse_ids}
					onClose={handleCloseEditor}
					onSave={handleSave}
					renderConflict={renderConflict}
				/>
			)}
			{deleting && (
				<UserRemovalDialog
					http={http}
					mode={mode}
					user={deleting}
					warehouseId={warehouseId}
					refreshUsers={query.refetch}
					isFetching={query.isFetching}
					readError={query.error}
					onClose={handleCloseEditor}
					onRemoved={handleRemoved}
					onReplace={handleReplaceRemoval}
					onUnavailable={handleRemovalUnavailable}
				/>
			)}
			{data && (
				<>
					<p className={styles.subtle} aria-live="polite">
						Найдено пользователей: {rows.length}
					</p>
					<UsersTable
						users={rows}
						onEdit={handleEdit}
						onDelete={handleDelete}
					/>
				</>
			)}
		</section>
	);
}
