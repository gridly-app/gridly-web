import type { ReactNode } from "react";
import type { SessionRepository } from "../../api/repository";
import { useSessionState } from "../useSessionState";
import { SessionContext } from "./sessionContext";

export interface SessionProviderProps {
	repository: SessionRepository;
	children: ReactNode;
}

export function SessionProvider({
	repository,
	children,
}: SessionProviderProps) {
	const session = useSessionState(repository);

	return (
		<SessionContext.Provider value={session}>
			{children}
		</SessionContext.Provider>
	);
}
