import {
	type ChangeEvent,
	type FocusEvent,
	type FormEvent,
	useState,
} from "react";

import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";

import type { ShipmentResource } from "../api/useShipmentResource";
import type { WorkingShipment } from "./shipment.dto";
import type { RunShipmentAction } from "./useShipmentActions";

const defaultLinkLifetimeMs = 7 * 86_400_000;

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
	const [issued, setIssued] = useState<{
		id?: string | undefined;
		url: string;
		expires_at: string;
	} | null>(null);
	const url =
		issued &&
		shareLink &&
		(!issued.id || issued.id === shareLink.id) &&
		Date.parse(issued.expires_at) === Date.parse(shareLink.expires_at) &&
		Date.parse(issued.expires_at) > Date.now()
			? issued.url
			: "";
	const [message, setMessage] = useState("");
	const [confirm, setConfirm] = useState<"issue" | "revoke" | null>(null);

	function handleIssue() {
		const expiresAt = parseUtcDateTimeInput(expiry);

		if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
			setMessage("Выберите срок действия в будущем.");
			return;
		}

		setConfirm(null);
		setMessage("");

		void run(
			async (signal) => {
				const result = await issueLink(expiresAt, signal);

				setIssued(result);
			},
			{ refreshAfterWrite: true },
		);
	}

	function handleRetry() {
		void run(
			async (signal) => {
				const result = await retryLink(signal);
				setIssued(result);
			},
			{ refreshAfterWrite: true },
		);
	}

	function handleRevoke() {
		setConfirm(null);
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
			setConfirm("issue");

			return;
		}

		handleIssue();
	}

	function handleExpiryChange(event: ChangeEvent<HTMLInputElement>) {
		setExpiry(event.currentTarget.value);
	}

	function handleRequestRevoke() {
		setConfirm("revoke");
	}

	function handleCloseConfirmation() {
		setConfirm(null);
	}

	function handleLinkFocus(event: FocusEvent<HTMLInputElement>) {
		event.currentTarget.select();
	}

	return {
		expiry,
		url,
		message,
		confirm,
		handleRetry,
		handleCopyLink,
		handleSubmit,
		handleExpiryChange,
		handleRequestRevoke,
		handleCloseConfirmation,
		handleLinkFocus,
		handleConfirm: confirm === "revoke" ? handleRevoke : handleIssue,
	};
}
