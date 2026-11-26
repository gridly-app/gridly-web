import { accountEntryPath } from "@/ports/navigation";

export function signInDestination(state: unknown) {
	if (!state || typeof state !== "object" || !("returnTo" in state))
		return accountEntryPath;

	const { returnTo } = state;

	if (
		typeof returnTo !== "string" ||
		!returnTo.startsWith("/") ||
		/[\\\s]/.test(returnTo) ||
		returnTo.startsWith("//")
	)
		return accountEntryPath;

	return returnTo;
}
