import { useState } from "react";

import { adminLocation } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { type HttpClient, isAccessDenied } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { managementStyles as styles } from "@/shared/ui/management";
import { Link } from "@/shared/ui/navigation";

import {
	type AuditUser,
	isEditableAccount,
	type Permission,
} from "./api/users.dto";
import { useAdminUsers } from "./api/usersApi";
import { canEditAccount } from "./model/accountActions";
import { useUserActions } from "./model/useUserActions";
import {
	defaultUserFilters,
	filterAdminUsers,
	userWarehouseOptions,
} from "./model/userFilters";
import { AddWarehouseMember } from "./ui/AddWarehouseMember/AddWarehouseMember";
import { UserAccessConflict } from "./ui/UserAccessConflict/UserAccessConflict";
import { UserAccessEditor } from "./ui/UserAccessEditor/UserAccessEditor";
import { UserRemovalDialog } from "./ui/UserRemovalDialog/UserRemovalDialog";
import { UsersFilters } from "./ui/UsersFilters/UsersFilters";
import { UsersTable } from "./ui/UsersTable/UsersTable";

import localStyles from "./Users.module.css";

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
	const [filters, setFilters] = useState(defaultUserFilters);
	const actions = useUserActions();
	const mode = useWorkspaceMode();
	const query = useAdminUsers(http, mode);
	const data = isAccessDenied(query.error) ? undefined : query.data;
	const users = data?.items ?? emptyUsers;
	const catalog = data?.permission_catalog;
	const canAdd =
		Boolean(catalog) &&
		Boolean(data?.allowed_actions.includes("add-warehouse-member"));
	const hasRefreshError = Boolean(data) && Boolean(query.error);
	const hasLoadError = Boolean(query.error) && !hasRefreshError;
	const rows = filterAdminUsers(
		users,
		filters,
		catalog ?? emptyPermissions,
		userId,
		userKind,
	);
	const { editing, deleting } = actions;
	const latest = users
		.filter(isEditableAccount)
		.find((user) => user.id === editing?.id);
	const replacement =
		latest && latest.revision !== editing?.revision ? latest : null;
	const latestActions = latest?.allowed_actions ?? [];

	function handleRestartEdit() {
		if (replacement) actions.startEdit(replacement);
	}

	function handleRemoved(warehouseId: string | undefined) {
		actions.finish(
			warehouseId ? "Доступ к складу отозван." : "Аккаунт деактивирован.",
		);
	}

	function handleRemovalUnavailable() {
		actions.finish(
			"Действие для этого пользователя больше недоступно.",
			"info",
		);
	}

	function handleSave() {
		actions.finish("Данные пользователя сохранены.");
	}

	function handleAdded() {
		actions.finish("Участник добавлен на склад.");
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

	return (
		<section className={styles.panel} aria-label="Пользователи">
			<div className={`${styles.toolbar} ${localStyles.toolbar}`}>
				<UsersFilters
					filters={filters}
					locations={userWarehouseOptions(users)}
					onChange={setFilters}
				/>
				{canAdd && (
					<Button className={localStyles.add} onClick={actions.openAdd}>
						Добавить участника на склад
					</Button>
				)}
			</div>
			{actions.isAdding && canAdd && catalog && (
				<AddWarehouseMember
					http={http}
					permissions={catalog}
					warehouseIds={data?.manageable_warehouse_ids}
					onClose={actions.closeAdd}
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
			{hasLoadError && (
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
			{actions.notice && (
				<Feedback tone={actions.notice.tone}>{actions.notice.text}</Feedback>
			)}
			{editing && canEditAccount(latestActions) && (
				<UserAccessEditor
					key={editing.revision}
					http={http}
					user={{ ...editing, allowed_actions: latestActions }}
					permissions={catalog}
					manageableWarehouseIds={data?.manageable_warehouse_ids}
					onClose={actions.closeAction}
					onSave={handleSave}
					renderConflict={renderConflict}
				/>
			)}
			{deleting && (
				<UserRemovalDialog
					http={http}
					mode={mode}
					user={deleting}
					warehouseId={actions.deletingWarehouseId}
					refreshUsers={query.refetch}
					isFetching={query.isFetching}
					readError={query.error}
					onClose={actions.closeAction}
					onRemoved={handleRemoved}
					onReplace={actions.replaceDelete}
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
						onEdit={actions.startEdit}
						onDelete={actions.startDelete}
					/>
				</>
			)}
		</section>
	);
}
