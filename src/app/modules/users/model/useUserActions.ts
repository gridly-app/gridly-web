import { useState } from "react";

import type { EditableAccount } from "../api/users.dto";

type UserAction = {
	type: "edit" | "delete";
	user: EditableAccount;
	warehouseId?: string | undefined;
};

type Notice = { text: string; tone: "success" | "info" };

export function useUserActions() {
	const [action, setAction] = useState<UserAction | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);
	const editing = action?.type === "edit" ? action.user : null;
	const deleting = action?.type === "delete" ? action.user : null;
	const deletingWarehouseId =
		action?.type === "delete" ? action.warehouseId : undefined;

	function startEdit(user: EditableAccount) {
		setNotice(null);
		setAction({ type: "edit", user });
	}

	function startDelete(user: EditableAccount, warehouseId?: string) {
		setNotice(null);
		setAction({ type: "delete", user, warehouseId });
	}

	function replaceDelete(user: EditableAccount) {
		setAction({ type: "delete", user, warehouseId: deletingWarehouseId });
	}

	function closeAction() {
		setAction(null);
	}

	function finish(text: string, tone: Notice["tone"] = "success") {
		setAction(null);
		setIsAdding(false);
		setNotice({ text, tone });
	}

	function openAdd() {
		setNotice(null);
		setIsAdding(true);
	}

	function closeAdd() {
		setIsAdding(false);
	}

	return {
		editing,
		deleting,
		deletingWarehouseId,
		isAdding,
		notice,
		startEdit,
		startDelete,
		replaceDelete,
		closeAction,
		finish,
		openAdd,
		closeAdd,
	};
}
