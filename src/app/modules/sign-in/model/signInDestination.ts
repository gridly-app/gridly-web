import { accountEntryPath } from "@/ports/navigation";

function isSafeInternalPath(path: unknown): path is string {
	if (typeof path !== "string") return false;

	return path.startsWith("/") && !path.startsWith("//") && !/[\\\s]/.test(path);
}

export function signInDestination(state: unknown) {
	if (!state || typeof state !== "object" || !("returnTo" in state))
		return accountEntryPath;

	return isSafeInternalPath(state.returnTo) ? state.returnTo : accountEntryPath;
}
