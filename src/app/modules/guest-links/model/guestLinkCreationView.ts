import type { GuestLinkCreationState } from "../api/guestLinkCreationAttempt";

export function guestLinkCreationView(
	state: GuestLinkCreationState | undefined,
) {
	const isPending = state?.status === "pending";
	const hasAttempt = isPending || state?.status === "unknown";

	return {
		attempt: hasAttempt ? state : null,
		issued: state?.status === "issued" ? state.link : null,
		isPending,
		error: state?.status === "rejected" ? state.error : null,
	};
}
