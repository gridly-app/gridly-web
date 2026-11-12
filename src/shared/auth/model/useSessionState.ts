import { useEffect, useSyncExternalStore } from "react";
import type { SessionRepository } from "../api/repository";
import type { SessionState } from "./context/sessionContext";

export function useSessionState(repository: SessionRepository): SessionState {
	const state = useSyncExternalStore(
		repository.subscribe,
		repository.getSnapshot,
	);
	useEffect(() => {
		void repository.restore();
	}, [repository]);
	return {
		...state,
		user: state.status === "active" ? state.user : "",
		authenticate: async (mode, credentials) => {
			await repository.authenticate(mode, credentials);
		},
		logout: async () => {
			repository.clear();
		},
		restore: repository.restore,
	};
}
