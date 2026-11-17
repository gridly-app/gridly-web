import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { SessionContext, type SessionState } from "@/ports/session";
import type { BrowserSessionRepository } from "../../api/repository";

export function SessionProvider({
	repository,
	children,
}: {
	repository: BrowserSessionRepository;
	children: ReactNode;
}) {
	const state = useSyncExternalStore(
		repository.subscribe,
		repository.getSnapshot,
	);

	useEffect(() => {
		void repository.restore();
	}, [repository]);

	const session: SessionState = {
		...state,
		user: state.status === "active" ? state.user : "",
		authenticate: async (mode, credentials) => {
			await repository.authenticate(mode, credentials);
		},
		logout: async () => {
			void repository.clear();
		},
		restore: repository.restore,
	};

	return (
		<SessionContext.Provider value={session}>
			{children}
		</SessionContext.Provider>
	);
}
