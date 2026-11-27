import { useEffect, useRef, useState } from "react";

import type { AuthMode, Credentials, SessionState } from "@/ports/session";
import { ApiError } from "@/shared/http";
import { errorMessage, useSingleFlight } from "@/shared/lib";

function authenticationError(reason: unknown) {
	const isLoginTaken =
		reason instanceof ApiError &&
		reason.status === 409 &&
		reason.code === "LOGIN_TAKEN";

	return isLoginTaken ? "Этот логин уже занят." : errorMessage(reason);
}

export function useAuthenticate(
	mode: AuthMode,
	authenticate: SessionState["authenticate"],
) {
	const [error, setError] = useState("");
	const flight = useSingleFlight();
	const isMounted = useRef(true);

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;
		};
	}, []);

	async function attempt(credentials: Credentials) {
		setError("");

		try {
			await authenticate(mode, credentials);

			return isMounted.current;
		} catch (reason) {
			setError(authenticationError(reason));

			return false;
		}
	}

	async function submit(credentials: Credentials) {
		const isAuthenticated = await flight.run(() => attempt(credentials));

		return isAuthenticated ?? false;
	}

	function clearError() {
		setError("");
	}

	return { submit, clearError, isPending: flight.isRunning, error };
}
