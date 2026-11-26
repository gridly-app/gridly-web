import { useEffect, useRef, useState } from "react";
import type { AuthMode, Credentials, SessionState } from "@/ports/session";
import { ApiError } from "@/shared/http";
import { errorMessage } from "@/shared/lib";

export function useAuthenticate(
	mode: AuthMode,
	authenticate: SessionState["authenticate"],
) {
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);
	const isSubmitting = useRef(false);
	const isMounted = useRef(true);

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;
		};
	}, []);

	async function submit(credentials: Credentials) {
		if (isSubmitting.current) return false;

		isSubmitting.current = true;
		setIsPending(true);
		setError("");

		try {
			await authenticate(mode, credentials);

			return isMounted.current;
		} catch (reason) {
			if (!isMounted.current) return false;

			const isLoginTaken =
				reason instanceof ApiError &&
				reason.status === 409 &&
				reason.code === "LOGIN_TAKEN";

			setError(isLoginTaken ? "Этот логин уже занят." : errorMessage(reason));

			return false;
		} finally {
			isSubmitting.current = false;

			if (isMounted.current) setIsPending(false);
		}
	}

	function clearError() {
		setError("");
	}

	return { submit, clearError, isPending, error };
}
