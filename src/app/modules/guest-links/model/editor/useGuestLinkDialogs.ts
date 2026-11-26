import { useState } from "react";

import type { HttpClient } from "@/shared/http";

import type { GuestLink } from "../../api/guestLink.dto";
import {
	type GuestLinkDialog,
	useGuestLinkActions,
} from "./useGuestLinkActions";

export function useGuestLinkDialogs(
	http: HttpClient,
	path: string,
	initialOrder: string | null,
	{
		canOpenEditor,
		isAccessDenied,
	}: { canOpenEditor: boolean; isAccessDenied: boolean },
) {
	const [dialog, setDialog] = useState<GuestLinkDialog | null>(
		initialOrder ? { type: "create" } : null,
	);
	const actions = useGuestLinkActions(http, path, handleSaved);
	const canShowDialog =
		dialog?.type === "revoke" ? !isAccessDenied : canOpenEditor;
	const activeDialog = canShowDialog ? dialog : null;

	function handleSaved() {
		setDialog(null);
	}

	function openDialog(next: GuestLinkDialog) {
		actions.resetFeedback();
		setDialog(next);
	}

	function handleCreate() {
		openDialog({ type: "create" });
	}

	function handleEdit(link: GuestLink) {
		openDialog({ type: "update", link });
	}

	function handleRevoke(link: GuestLink) {
		openDialog({ type: "revoke", link });
	}

	function handleClose() {
		if (!actions.isBusy) setDialog(null);
	}

	return {
		activeDialog,
		actions,
		handleCreate,
		handleEdit,
		handleRevoke,
		handleClose,
	};
}
