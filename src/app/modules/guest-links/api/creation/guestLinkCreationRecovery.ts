import { errorMessage } from "@/shared/lib";

import type { createGuestLinkCreationAttempt } from "./guestLinkCreationAttempt";
import type { createGuestLinksCache } from "../guestLinksCache";

export function createGuestLinkCreationRecovery(
	attempt: ReturnType<typeof createGuestLinkCreationAttempt>,
	list: ReturnType<typeof createGuestLinksCache>,
) {
	async function refreshList() {
		const unconfirmed = attempt.read();

		if (unconfirmed?.status !== "unknown") return;

		await list.cancelRead();

		if (attempt.read() !== unconfirmed) return;

		try {
			const refreshed = await list.refresh();
			const resolution = unconfirmed.resolution;
			const expiredLinkId =
				resolution?.status === "secret-expired" ? resolution.linkId : null;
			const isExpiredLinkRevoked = refreshed.items.some(
				({ id, status }) => id === expiredLinkId && status === "revoked",
			);

			if (attempt.read() === unconfirmed && isExpiredLinkRevoked)
				attempt.finish(null);
		} catch (error) {
			if (attempt.read() === unconfirmed) {
				attempt.set({ ...unconfirmed, message: errorMessage(error) });
			}
		}
	}

	return { refreshList };
}
