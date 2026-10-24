import type { ReactNode } from "react";
import type { SessionRepository } from "../../api/repository";
import { useSessionState } from "../useSessionState";
import { SessionContext } from "./sessionContext";

export interface SessionProviderProps {
	repository: SessionRepository;
	onLogout: () => void;
	children: ReactNode;
}

export function SessionProvider({
	repository,
	onLogout,
	children,
}: SessionProviderProps) {
	const session = useSessionState(repository, onLogout);

	return (
		<SessionContext.Provider value={session}>
			{children}
		</SessionContext.Provider>
	);
}
