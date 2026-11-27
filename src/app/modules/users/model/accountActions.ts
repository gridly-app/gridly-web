import type { EditableAccount } from "../api/users.dto";

const editActions = ["edit-profile", "edit-memberships"];

export function canEditAccount(actions: readonly string[]) {
	return actions.some((action) => editActions.includes(action));
}

export function canStillRemove(
	account: EditableAccount,
	warehouseId: string | undefined,
) {
	const requiredAction = warehouseId
		? "revoke-warehouse-access"
		: "deactivate-account";
	const hasWarehouse =
		!warehouseId ||
		account.warehouses.some(({ warehouse_id }) => warehouse_id === warehouseId);

	return account.allowed_actions.includes(requiredAction) && hasWarehouse;
}
