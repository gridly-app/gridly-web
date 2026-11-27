import { isReplayAvailable, issuedLinkSchema } from "@/domain/shipment";
import { environment } from "@/shared/config";
import { type HttpClient, parseResponse } from "@/shared/http";
import { UserError } from "@/shared/lib";

import type { WorkingShipment } from "./shipment.dto";
import type { ShipmentCreation } from "./shipmentCreationStorage";
import type { ShipmentCreationAccess } from "./useShipmentCreation";

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
		update: (
			current: WorkingShipment | undefined,
		) => WorkingShipment | undefined,
	) => Promise<void>;
}) {
	async function issueLink(
		expiresAt: string,
		signal: AbortSignal,
		retry?: ShipmentCreation,
	) {
		const link = await creation.create(
			"link",
			async (key) => {
				const response = await http.request(`${path}/share-link`, {
					method: "POST",
					body: { expires_at: expiresAt },
					idempotencyKey: key,
					privacy: true,
					signal,
				});

				return parseResponse(issuedLinkSchema, response);
			},
			{ expiresAt, retry },
		);

		await applyConfirmedUpdate(
			signal,
			(current) =>
				current && {
					...current,
					share_link: {
						id: link.id,
						expires_at: link.expires_at,
						origin: "operator",
					},
				},
		);

		return link;
	}

	async function revokeLink(signal: AbortSignal) {
		const attempt = creation.getAttempt();

		if (attempt?.status === "secret-expired") {
			const latest = await rereadShipment();
			signal.throwIfAborted();

			const currentLink = latest?.share_link;
			const isAnotherLink =
				currentLink?.id !== undefined && currentLink.id !== attempt.linkId;

			if (!currentLink || isAnotherLink) {
				creation.clear();

				throw new UserError(
					"Ссылка этой попытки больше не является текущей. Обновите данные.",
				);
			}
		}

		await http.request(`${path}/share-link`, { method: "DELETE", signal });

		if (attempt?.status === "secret-expired") creation.clear();

		await applyConfirmedUpdate(
			signal,
			(current) => current && { ...current, share_link: null },
		);
	}

	async function retryLink(signal: AbortSignal) {
		const attempt = creation.getAttempt();

		if (
			attempt?.kind !== "link" ||
			attempt.status !== "unknown" ||
			!attempt.expiresAt ||
			!environment.adminGuestLinkReplay ||
			!isReplayAvailable(attempt.startedAt)
		) {
			throw new UserError("Безопасный повтор выпуска ссылки недоступен.");
		}

		return issueLink(attempt.expiresAt, signal, attempt);
	}

	return { issueLink, revokeLink, retryLink };
}
