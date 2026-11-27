import type { Credentials } from "@/ports/session";
import { ApiError, type HttpClient, parseResponse } from "@/shared/http";

import { accountIdentitySchema } from "./accountIdentity";
import type { AccountPersistence } from "./accountPersistence";
import { accountAuthEndpoints } from "./authEndpoints";

interface LoginAttempt {
	credentials: Credentials;
	signal: AbortSignal;
	canUseCookie: boolean;
	assertActive: () => void;
}

export function isInvalidCredentials(error: unknown) {
	return (
		error instanceof ApiError &&
		error.status === 401 &&
		error.code === "INVALID_CREDENTIALS"
	);
}

export async function loginAccount(
	http: HttpClient,
	persistence: AccountPersistence,
	{ credentials, signal, canUseCookie, assertActive }: LoginAttempt,
) {
	const previous = persistence.read();
	const isMarked = canUseCookie && persistence.beginLogin();
	const canRemember = canUseCookie;

	try {
		const response = await http.request(accountAuthEndpoints.login, {
			method: "POST",
			body: credentials,
			signal,
			credentials: canRemember ? "include" : "omit",
		});

		assertActive();

		const user = parseResponse(accountIdentitySchema, response).user.login;

		return { user, canRemember };
	} catch (error) {
		const shouldRestorePrevious =
			isMarked && previous && isInvalidCredentials(error);

		if (shouldRestorePrevious) {
			persistence.write(previous);

			throw error;
		}

		if (isMarked) persistence.clear();

		throw error;
	}
}
