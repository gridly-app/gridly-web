import { useState } from "react";

import type { WorkspaceMode } from "@/ports/session";
import { ApiError, type HttpClient, isStaleRevision } from "@/shared/http";
import { UserError } from "@/shared/lib";
import { DeleteConfirmation } from "@/shared/ui/management";

import { type EditableAccount, isEditableAccount } from "../../api/users.dto";
import {
	isForbidden,
	type useAdminUsers,
	useRemoveAdminUser,
} from "../../api/usersApi";
import { canStillRemove } from "../../model/accountActions";
import { userActionError } from "../../model/userActionError";
import { OwnershipTransfer } from "../OwnershipTransfer/OwnershipTransfer";

function isOwnerTransferRequired(error: unknown) {
	return (
		error instanceof ApiError &&
		error.code === "WAREHOUSE_OWNER_TRANSFER_REQUIRED"
	);
}

export function UserRemovalDialog({
	http,
	mode,
	user: deleting,
	warehouseId,
	accounts,
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
	accounts: EditableAccount[];
	refreshUsers: ReturnType<typeof useAdminUsers>["refetch"];
	isFetching: boolean;
	readError: Error | null;
	onClose: () => void;
	onRemoved: (warehouseId: string | undefined) => void;
	onReplace: (user: EditableAccount) => void;
	onUnavailable: () => void;
}) {
	const [isTransferring, setIsTransferring] = useState(false);
	const removeUser = useRemoveAdminUser(http, mode, () =>
		onRemoved(warehouseId),
	);
	const isStale = isStaleRevision(removeUser.error);
	const isRefreshingRemoval = isStale && isFetching;
	const removedWarehouse = deleting.warehouses.find(
		({ warehouse_id }) => warehouse_id === warehouseId,
	);
	const deleteError = isStale && readError ? readError : removeUser.error;
	const removalMessage =
		deleteError && !isStale
			? new UserError(userActionError(deleteError))
			: deleteError;
	const recovery = removalRecovery();
	const warehouseName = removedWarehouse?.warehouse_name ?? warehouseId;
	const texts = warehouseId
		? {
				title: "Отозвать доступ к складу?",
				description: `Пользователь «${deleting.name}» потеряет доступ к складу «${warehouseName}».`,
				confirm: "Отозвать доступ к складу",
			}
		: {
				title: "Деактивировать аккаунт?",
				description: `У аккаунта «${deleting.name}» будут отозваны все сессии и доступы ко всем складам.`,
				confirm: "Деактивировать аккаунт",
			};

	function removalRecovery() {
		if (isStale) {
			return {
				label: "Обновить данные пользователя",
				action: handleRefreshForDelete,
			};
		}

		if (isOwnerTransferRequired(removeUser.error)) {
			return { label: "Передать владение", action: handleStartTransfer };
		}

		return null;
	}

	function handleCloseDelete() {
		if (!removeUser.isPending && !isRefreshingRemoval) onClose();
	}

	function handleConfirmDelete() {
		if (isStale || isForbidden(removeUser.error)) return;

		const input = warehouseId ? { ...deleting, warehouseId } : deleting;

		removeUser.mutate(input);
	}

	async function handleRefreshForDelete() {
		const refreshed = await refreshUsers();

		if (!refreshed.isSuccess) return;

		const current = refreshed.data.items
			.filter(isEditableAccount)
			.find((user) => user.id === deleting.id);

		removeUser.reset();

		if (current && canStillRemove(current, warehouseId)) {
			onReplace(current);

			return;
		}

		onUnavailable();
	}

	function handleStartTransfer() {
		setIsTransferring(true);
	}

	function handleCancelTransfer() {
		setIsTransferring(false);
	}

	async function handleTransferred() {
		setIsTransferring(false);
		await handleRefreshForDelete();
	}

	if (isTransferring) {
		return (
			<OwnershipTransfer
				http={http}
				mode={mode}
				owner={deleting}
				warehouseId={warehouseId}
				accounts={accounts}
				onBack={handleCancelTransfer}
				onTransferred={handleTransferred}
			/>
		);
	}

	return (
		<DeleteConfirmation
			title={texts.title}
			description={texts.description}
			confirmLabel={texts.confirm}
			recoverLabel={recovery?.label}
			isPending={removeUser.isPending || isRefreshingRemoval}
			error={removalMessage}
			onClose={handleCloseDelete}
			onConfirm={handleConfirmDelete}
			onRecover={recovery?.action}
		/>
	);
}
