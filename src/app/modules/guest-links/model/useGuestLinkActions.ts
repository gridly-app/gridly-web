import { useState } from "react";

import type { FetchHttpClient } from "@/shared/http";
import { useGuestLinkMutation } from "../api/guestLinksApi";

import type { GuestLink, GuestLinkInput } from "../api/guestLink.dto";

export type GuestLinkDialog =
	{ type: "create" } | { type: "update" | "revoke"; link: GuestLink };

export function useGuestLinkActions(
	http: FetchHttpClient,
	path: string,
	onSaved: () => void,
) {
	const [notice, setNotice] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);
	const {
		mutation,
		attempt,
		issued,
		startCreation,
		acknowledgeUnknownCreation,
	} = useGuestLinkMutation(http, path, (result) => {
		onSaved();

		const text =
			result.type === "revoke" ? "Ссылка отозвана." : "Доступ сохранён.";

		setNotice({ text, tone: "success" });
	});

	function handleSave(form: GuestLinkDialog, input: GuestLinkInput) {
		if (form.type === "revoke") return;

		if (form.type === "update") {
			const { id, revision } = form.link;
			mutation.mutate({ type: "update", id, revision, input });

			return;
		}

		startCreation(input);
	}

	function clearNotice() {
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
		mutation,
		attempt,
		acknowledgeUnknownCreation,
		issued,
		notice,
		handleSave,
		handleCopy,
		clearNotice,
	};
}
