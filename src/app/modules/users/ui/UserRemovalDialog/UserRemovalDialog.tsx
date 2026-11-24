import type { WorkspaceMode } from "@/ports/session";
import { type HttpClient, isStaleRevision } from "@/shared/http";
import { DeleteConfirmation } from "@/shared/ui/management";

import { type EditableAccount, isEditableAccount } from "../../api/users.dto";
import {
	isForbidden,
	type useAdminUsers,
	useRemoveAdminUser,
} from "../../api/usersApi";
import { userActionError } from "../../model/userActionError";

export function UserRemovalDialog({
	http,
	mode,
	user: deleting,
	warehouseId,
	refreshUsers,
	isFetching,
	readError,
	onClose,
	onRemoved,
	onReplace,
	onUnavailable,
}: {
	http: HttpClient;
	mode: WorkspaceMode;
	user: EditableAccount;
	warehouseId: string | undefined;
	refreshUsers: ReturnType<typeof useAdminUsers>["refetch"];
	isFetching: boolean;
	readError: Error | null;
	onClose: () => void;
	onRemoved: (warehouseId: string | undefined) => void;
	onReplace: (user: EditableAccount) => void;
	onUnavailable: () => void;
}) {
	const removeUser = useRemoveAdminUser(http, mode, () =>
		onRemoved(warehouseId),
	);
	const staleRevision = isStaleRevision(removeUser.error);
	const isRefreshingRemoval = staleRevision && isFetching;
	const removedWarehouse = deleting.warehouses.find(
		({ warehouse_id }) => warehouse_id === warehouseId,
	);
	const deleteError = staleRevision && readError ? readError : removeUser.error;
	const removalMessage =
		deleteError && !staleRevision
			? new Error(userActionError(deleteError))
			: deleteError;
	const refreshDelete = staleRevision ? handleRefreshForDelete : undefined;

	function handleCloseDelete() {
		if (!removeUser.isPending && !isRefreshingRemoval) onClose();
	}

	function handleConfirmDelete() {
		if (staleRevision || isForbidden(removeUser.error)) return;

		const input = warehouseId ? { ...deleting, warehouseId } : deleting;

		removeUser.mutate(input);
	}

	async function handleRefreshForDelete() {
		const refreshed = await refreshUsers();

		if (!refreshed.isSuccess) return;

		const current = refreshed.data.items.find(
			(user) => user.id === deleting.id && isEditableAccount(user),
		);
		removeUser.reset();

		const required = warehouseId
			? "revoke-warehouse-access"
			: "deactivate-account";

		if (
			current &&
			isEditableAccount(current) &&
			current.allowed_actions.includes(required) &&
			(!warehouseId ||
				current.warehouses.some(
					({ warehouse_id }) => warehouse_id === warehouseId,
				))
		) {
			onReplace(current);

			return;
		}

		onUnavailable();
	}

	return (
		<DeleteConfirmation
			title={
				warehouseId ? "Отозвать доступ к складу?" : "Деактивировать аккаунт?"
			}
			description={
				warehouseId
					? `Пользователь «${deleting.name}» потеряет доступ к складу «${removedWarehouse?.warehouse_name ?? warehouseId}».`
					: `У аккаунта «${deleting.name}» будут отозваны все сессии и доступы ко всем складам.`
			}
			confirmLabel={
				warehouseId ? "Отозвать доступ к складу" : "Деактивировать аккаунт"
			}
			refreshLabel="Обновить данные пользователя"
			isPending={removeUser.isPending || isRefreshingRemoval}
			error={removalMessage}
			onClose={handleCloseDelete}
			onConfirm={handleConfirmDelete}
			onRefresh={refreshDelete}
		/>
	);
}
