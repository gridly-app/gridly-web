import type { GuestLinkCreationState } from "../../api/creation/guestLinkCreationState";

export function guestLinkCreationView(
	state: GuestLinkCreationState | undefined,
) {
	const isPending = state?.status === "pending";
	const isStorageBlocked = state?.status === "storage-error";
	const hasAttempt = isPending || state?.status === "unknown";

	return {
		attempt: hasAttempt ? state : null,
		issued: state?.status === "issued" ? state.link : null,
		isPending,
		isStorageBlocked,
		error:
			state?.status === "rejected" || isStorageBlocked ? state.error : null,
	};
}
