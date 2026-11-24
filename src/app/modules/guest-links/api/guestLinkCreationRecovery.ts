import { errorMessage } from "@/shared/lib";
import type { createGuestLinkCreationAttempt } from "./guestLinkCreationAttempt";
import type { createGuestLinksCache } from "./guestLinksCache";

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

			if (
				attempt.read() === unconfirmed &&
				resolution?.status === "secret-expired" &&
				refreshed.items.some(
					({ id, status }) => id === resolution.linkId && status === "revoked",
				)
			) {
				attempt.finish(null);
			}
		} catch (error) {
			if (attempt.read() === unconfirmed) {
				attempt.set({ ...unconfirmed, message: errorMessage(error) });
			}
		}
	}

	return { refreshList };
}
