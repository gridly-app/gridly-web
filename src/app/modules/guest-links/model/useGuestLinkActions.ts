import { useState } from "react";

import type { HttpClient } from "@/shared/http";

import type { GuestLink, GuestLinkInput } from "../api/guestLink.dto";
import { useGuestLinkChanges } from "./useGuestLinkChanges";
import { useGuestLinkCreation } from "./useGuestLinkCreation";

export type GuestLinkEditor =
	{ type: "create" } | { type: "update"; link: GuestLink };

export type GuestLinkDialog =
	GuestLinkEditor | { type: "revoke"; link: GuestLink };

export function useGuestLinkActions(
	http: HttpClient,
	path: string,
	onSaved: () => void,
) {
	const [notice, setNotice] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);

	function showSaved(text: string) {
		onSaved();
		setNotice({ text, tone: "success" });
	}

	const creation = useGuestLinkCreation(http, path);
	const changes = useGuestLinkChanges(http, path, (change) => {
		if (change.type === "revoke") {
			creation.forgetIssuedLink(change.id);
			showSaved("Ссылка отозвана.");

			return;
		}

		showSaved("Доступ сохранён.");
	});

	function saveLink(editor: GuestLinkEditor, input: GuestLinkInput) {
		if (editor.type === "update") {
			changes.updateLink(editor.link, input);

			return;
		}

		void creation.startCreation(input).then(handleCreationResult);
	}

	function handleCreationResult(created: boolean) {
		if (created) showSaved("Доступ сохранён.");
	}

	function retryCreation() {
		void creation.retryCreation().then(handleCreationResult);
	}

	function resetFeedback() {
		creation.resetError();
		changes.resetError();
		setNotice(null);
	}

	async function handleCopy(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			setNotice({ text: "Ссылка скопирована.", tone: "success" });
		} catch {
			setNotice({
				text: "Не удалось скопировать ссылку. Проверьте доступ к буферу обмена и повторите.",
				tone: "error",
			});
		}
	}

	return {
		creation: { ...creation, retryCreation },
		changeError: changes.error,
		isRevoking: changes.isRevoking,
		isBusy: creation.isPending || changes.isPending,
		notice,
		saveLink,
		revokeLink: changes.revokeLink,
		handleCopy,
		resetFeedback,
	};
}
