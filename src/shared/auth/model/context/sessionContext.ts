import { createContext, useContext } from "react";

import type { AuthMode, Credentials } from "../../api/repository";

export interface SessionState {
	user: string;
	status: "restoring" | "active" | "ended" | "error";
	error: string;
	restore: () => Promise<void>;
	login: (user: string) => void;
	authenticate: (mode: AuthMode, credentials: Credentials) => Promise<void>;
	logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
	const context = useContext(SessionContext);

	if (!context) {
		throw new Error("SessionProvider is missing");
	}

	return context;
}
