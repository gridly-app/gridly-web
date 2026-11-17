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

		const hasRefreshedList = await list.refresh().then(
			() => true,
			() => false,
		);

		if (attempt.read() === unconfirmed) {
			attempt.set({ ...unconfirmed, hasRefreshedList });
		}
	}

	function acknowledge() {
		const state = attempt.read();

		if (state?.status === "unknown" && state.hasRefreshedList) {
			attempt.finish(null);
		}
	}

	return { refreshList, acknowledge };
}
