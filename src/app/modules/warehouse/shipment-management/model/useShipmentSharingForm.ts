import {
	type ChangeEvent,
	type FocusEvent,
	type FormEvent,
	useState,
} from "react";

import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";

import type { WorkingShipment } from "../api/shipment.dto";
import type { ShipmentResource } from "../api/useShipmentResource";
import type { RunShipmentAction } from "./useShipmentActions";

const dayMs = 86_400_000;
const defaultLinkLifetimeMs = 7 * dayMs;

type IssuedLink = { id?: string | undefined; url: string; expires_at: string };

function visibleLinkUrl(
	issued: IssuedLink | null,
	shareLink: WorkingShipment["share_link"],
) {
	if (!issued || !shareLink) return "";

	const expiresAt = Date.parse(issued.expires_at);
	const isSameLink = !issued.id || issued.id === shareLink.id;
	const isSameExpiry = expiresAt === Date.parse(shareLink.expires_at);
	const isActive = expiresAt > Date.now();

	return isSameLink && isSameExpiry && isActive ? issued.url : "";
}

export function useShipmentSharingForm({
	shareLink,
	issueLink,
	revokeLink,
	retryLink,
	run,
}: {
	shareLink: WorkingShipment["share_link"];
	issueLink: ShipmentResource["issueLink"];
	revokeLink: ShipmentResource["revokeLink"];
	retryLink: ShipmentResource["retryLink"];
	run: RunShipmentAction;
}) {
	const [expiry, setExpiry] = useState(() =>
		toUtcDateTimeInput(Date.now() + defaultLinkLifetimeMs),
	);
	const [issued, setIssued] = useState<IssuedLink | null>(null);
	const [message, setMessage] = useState("");
	const [confirmation, setConfirmation] = useState<"issue" | "revoke" | null>(
		null,
	);
	const url = visibleLinkUrl(issued, shareLink);

	function handleIssue() {
		const expiresAt = parseUtcDateTimeInput(expiry);

		if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
			setMessage("Выберите срок действия в будущем.");

			return;
		}

		setConfirmation(null);
		setMessage("");

		void run(async (signal) => setIssued(await issueLink(expiresAt, signal)), {
			refreshAfterWrite: true,
		});
	}

	function handleRetry() {
		void run(async (signal) => setIssued(await retryLink(signal)), {
			refreshAfterWrite: true,
		});
	}

	function handleRevoke() {
		setConfirmation(null);
		setMessage("");

		void run(
			async (signal) => {
				await revokeLink(signal);
				setIssued(null);
			},
			{ refreshAfterWrite: true },
		);
	}

	async function handleCopyLink() {
		try {
			await navigator.clipboard.writeText(url);
			setMessage("Ссылка скопирована.");
		} catch {
			setMessage("Скопируйте ссылку из поля вручную.");
		}
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (shareLink) {
			setConfirmation("issue");

			return;
		}

		handleIssue();
	}

	function handleExpiryChange(event: ChangeEvent<HTMLInputElement>) {
		setExpiry(event.currentTarget.value);
	}

	function handleRequestRevoke() {
		setConfirmation("revoke");
	}

	function handleCloseConfirmation() {
		setConfirmation(null);
	}

	function handleLinkFocus(event: FocusEvent<HTMLInputElement>) {
		event.currentTarget.select();
	}

	return {
		expiry,
		url,
		message,
		confirmation,
		handleRetry,
		handleCopyLink,
		handleSubmit,
		handleExpiryChange,
		handleRequestRevoke,
		handleCloseConfirmation,
		handleLinkFocus,
		handleConfirm: confirmation === "revoke" ? handleRevoke : handleIssue,
	};
}
