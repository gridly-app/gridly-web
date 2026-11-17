import { useMemo, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { type FetchHttpClient, isStaleRevision } from "@/shared/http";
import { useAdminUsers, useRemoveAdminUser } from "./api/usersApi";

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
import { userPermissionCatalog } from "./model/userPermissionCatalog";

import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";

import { UsersFilters } from "./ui/UsersFilters/UsersFilters";
import {
	DeleteConfirmation,
	RevisionConflict,
	managementStyles as styles,
} from "@/shared/ui/management";
import { UsersTable } from "./ui/UsersTable/UsersTable";
import { UserAccessEditor } from "./ui/UserAccessEditor/UserAccessEditor";

const emptyPermissions: Permission[] = [];
const emptyUsers: AuditUser[] = [];

export function Users({
	http,
	userId,
	userKind,
}: {
	http: FetchHttpClient;
	userId: string | null;
	userKind: AuditUser["kind"] | undefined;
}) {
	const [action, setAction] = useState<{
		type: "edit" | "delete";
		user: EditableAccount;
	} | null>(null);
	const editing = action?.type === "edit" ? action.user : null;
	const deleting = action?.type === "delete" ? action.user : null;
	const [notice, setNotice] = useState<{
		text: string;
		tone: "success" | "info";
	} | null>(null);
	const [filters, setFilters] = useState(defaultUserFilters);
	const mode = useWorkspaceMode();
	const query = useAdminUsers(http, mode);
	const removeUser = useRemoveAdminUser(http, mode, () => {
		setAction(null);
		setNotice({ text: "Пользователь удалён.", tone: "success" });
	});
	const staleRevision = isStaleRevision(removeUser.error);
	const isRefreshingRemoval = staleRevision && query.isFetching;
	const users = query.error ? emptyUsers : (query.data?.items ?? emptyUsers);
	const serverCatalog = query.data?.permission_catalog;
	const catalog = useMemo(
		() => userPermissionCatalog(users, serverCatalog),
		[users, serverCatalog],
	);
	const permissions = catalog ?? emptyPermissions;
	const rows = filterAdminUsers(users, filters, permissions, userId, userKind);
	const locations = userWarehouseOptions(users);
	const latest = users.find(
		(user) => editing?.id === user.id && isEditableAccount(user),
	);
	const replacement =
		latest && isEditableAccount(latest) && latest.revision !== editing?.revision
			? latest
			: null;
	const deleteError =
		staleRevision && query.error ? query.error : removeUser.error;
	const refreshDelete = staleRevision ? handleRefreshForDelete : undefined;

	function handleEdit(user: EditableAccount) {
		setNotice(null);
		setAction({ type: "edit", user });
	}

	function handleDelete(user: EditableAccount) {
		removeUser.reset();
		setNotice(null);
		setAction({ type: "delete", user });
	}

	function handleCloseDelete() {
		if (!removeUser.isPending && !isRefreshingRemoval) setAction(null);
	}

	function handleConfirmDelete() {
		if (!deleting || staleRevision) return;

		removeUser.mutate(deleting);
	}

	async function handleRefreshForDelete() {
		if (!deleting) return;

		const refreshed = await query.refetch();

		if (!refreshed.isSuccess) return;

		const current = refreshed.data.items.find(
			(user) => user.id === deleting.id && isEditableAccount(user),
		);
		removeUser.reset();

		if (current && isEditableAccount(current)) {
			setAction({ type: "delete", user: current });

			return;
		}

		setAction(null);
		setNotice({
			text: "Пользователь больше недоступен для удаления.",
			tone: "info",
		});
	}

	function handleCloseEditor() {
		setAction(null);
	}

	function handleRestartEdit() {
		if (replacement) setAction({ type: "edit", user: replacement });
	}

	function renderConflict() {
		let details;

		if (replacement) {
			details = (
				<div>
					<p>
						Сохранено на сервере: {replacement.name} ({replacement.login})
					</p>
					<ul>
						{replacement.warehouses.map((warehouse) => (
							<li key={warehouse.warehouse_id}>
								{warehouse.warehouse_name}:{" "}
								{warehouse.permissions.join(", ") || "Нет разрешений"}
							</li>
						))}
					</ul>
				</div>
			);
		} else if (query.error) {
			details = <Feedback tone="error">{errorMessage(query.error)}</Feedback>;
		} else if (query.isSuccess && !latest) {
			details = <p>Пользователь больше недоступен для редактирования.</p>;
		}

		return (
			<RevisionConflict
				details={details}
				onRefresh={query.refetch}
				onRestart={replacement ? handleRestartEdit : undefined}
			/>
		);
	}

	function handleSave() {
		setAction(null);
		setNotice({ text: "Данные пользователя сохранены.", tone: "success" });
	}

	return (
		<section className={styles.panel} aria-label="Пользователи">
			<UsersFilters
				filters={filters}
				locations={locations}
				onChange={setFilters}
			/>
			{userId && (
				<Link className={styles.link} to={adminLocation("users")}>
					Показать всех пользователей
				</Link>
			)}
			{query.isPending && (
				<Feedback tone="loading">Загружаем пользователей…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{notice && <Feedback tone={notice.tone}>{notice.text}</Feedback>}
			{editing && (
				<UserAccessEditor
					key={editing.revision}
					http={http}
					user={editing}
					permissions={catalog}
					onClose={handleCloseEditor}
					onSave={handleSave}
					renderConflict={renderConflict}
				/>
			)}
			{deleting && (
				<DeleteConfirmation
					title="Удалить пользователя?"
					description={`Пользователь «${deleting.name}» потеряет доступ к складам.`}
					confirmLabel="Удалить пользователя"
					refreshLabel="Обновить данные пользователя"
					isPending={removeUser.isPending || isRefreshingRemoval}
					error={deleteError}
					onClose={handleCloseDelete}
					onConfirm={handleConfirmDelete}
					onRefresh={refreshDelete}
				/>
			)}
			{query.data && !query.error && (
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
