import { useAttemptSession } from "@/ports/session";
import { operationAttemptKey } from "@/shared/lib";

export function useCreationStorageKey(path: string) {
	const attemptSession = useAttemptSession();

	if (!attemptSession) return null;

	const { mode, sessionId } = attemptSession;

	return operationAttemptKey("guest-link", [mode, sessionId, path]);
}
