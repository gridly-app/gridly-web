import { isReplayAvailable, issuedLinkSchema } from "@/domain/shipment";
import { environment } from "@/shared/config";
import { type HttpClient, parseResponse } from "@/shared/http";
import { UserError } from "@/shared/lib";

import type { WorkingShipment } from "./shipment.dto";
import type { ShipmentCreation } from "./shipmentCreationStorage";
import type { ShipmentCreationAccess } from "./useShipmentCreation";

type ShipmentUpdate = (
	current: WorkingShipment | undefined,
) => WorkingShipment | undefined;

export function canReplayLink(
	attempt: ShipmentCreation | null | undefined,
): attempt is ShipmentCreation & { expiresAt: string } {
	return (
		attempt?.kind === "link" &&
		attempt.status === "unknown" &&
		Boolean(attempt.expiresAt) &&
		environment.adminGuestLinkReplay &&
		isReplayAvailable(attempt.startedAt)
	);
}

export function shipmentSharing({
	http,
	path,
	creation,
	rereadShipment,
	applyConfirmedUpdate,
}: {
	http: Pick<HttpClient, "request">;
	path: string;
	creation: Pick<ShipmentCreationAccess, "getAttempt" | "create" | "clear">;
	rereadShipment: () => Promise<WorkingShipment | undefined>;
	applyConfirmedUpdate: (
		signal: AbortSignal,
		update: ShipmentUpdate,
	) => Promise<void>;
}) {
	async function sendLink(expiresAt: string, signal: AbortSignal, key: string) {
		const response = await http.request(`${path}/share-link`, {
			method: "POST",
			body: { expires_at: expiresAt },
			idempotencyKey: key,
			privacy: true,
			signal,
		});

		return parseResponse(issuedLinkSchema, response);
	}

	async function issueLink(
		expiresAt: string,
		signal: AbortSignal,
		retry?: ShipmentCreation,
	) {
		const link = await creation.create(
			"link",
			(key) => sendLink(expiresAt, signal, key),
			{ expiresAt, retry },
		);
		const shareLink = {
			id: link.id,
			expires_at: link.expires_at,
			origin: "operator",
		} as const;

		await applyConfirmedUpdate(
			signal,
			(current) => current && { ...current, share_link: shareLink },
		);

		return link;
	}

	async function ensureCurrentLink(
		attempt: ShipmentCreation,
		signal: AbortSignal,
	) {
		const latest = await rereadShipment();

		signal.throwIfAborted();

		const currentLink = latest?.share_link;
		const isAnotherLink =
			currentLink?.id !== undefined && currentLink.id !== attempt.linkId;

		if (currentLink && !isAnotherLink) return;

		creation.clear();

		throw new UserError(
			"Ссылка этой попытки больше не является текущей. Обновите данные.",
		);
	}

	async function revokeLink(signal: AbortSignal) {
		const attempt = creation.getAttempt();
		const isExpiredAttempt = attempt?.status === "secret-expired";

		if (isExpiredAttempt) await ensureCurrentLink(attempt, signal);

		await http.request(`${path}/share-link`, { method: "DELETE", signal });

		if (isExpiredAttempt) creation.clear();

		await applyConfirmedUpdate(
			signal,
			(current) => current && { ...current, share_link: null },
		);
	}

	async function retryLink(signal: AbortSignal) {
		const attempt = creation.getAttempt();

		if (!canReplayLink(attempt))
			throw new UserError("Безопасный повтор выпуска ссылки недоступен.");

		return issueLink(attempt.expiresAt, signal, attempt);
	}

	return { issueLink, revokeLink, retryLink };
}
