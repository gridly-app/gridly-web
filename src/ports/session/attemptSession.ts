import { useSandboxAccess, useWorkspaceMode } from "./sandboxContext";
import { useSession } from "./sessionContext";

export function useAttemptSession() {
	const mode = useWorkspaceMode();
	const session = useSession();
	const { access } = useSandboxAccess();
	const accountSessionId =
		session.status === "active" ? session.sessionId : null;
	const sessionId = mode === "sandbox" ? access?.access_id : accountSessionId;

	if (!sessionId) return null;

	return { mode, sessionId };
}
