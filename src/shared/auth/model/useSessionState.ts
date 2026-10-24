import { useState } from "react";
import type {
	AuthMode,
	Credentials,
	SessionRepository,
} from "../api/repository";
import type { SessionState } from "./context/sessionContext";

export function useSessionState(
	repository: SessionRepository,
	onLogout: () => void,
): SessionState {
	const [state, setState] = useState(() => ({
		user: repository.current(),
		isDemo: repository.isDemo(),
	}));

	function login(nextUser: string) {
		repository.remember(nextUser);
		setState({ user: nextUser, isDemo: repository.isDemo() });
	}

	async function authenticate(mode: AuthMode, credentials: Credentials) {
		login(await repository.authenticate(mode, credentials));
	}

	async function enterDemo() {
		await repository.enterDemo();
		onLogout();
		login("demo");
	}

	async function logout() {
		await repository.clear();
		onLogout();
		setState({ user: "", isDemo: false });
	}

	return { ...state, login, authenticate, enterDemo, logout };
}
