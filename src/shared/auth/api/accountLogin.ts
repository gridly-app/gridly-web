import { z } from "zod";
import { ApiError, type HttpClient, parseResponse } from "@/shared/api";
import type { AccountPersistence } from "./accountPersistence";

export type Credentials = { login: string; password: string };

const accountIdentitySchema = z.object({
	user: z.object({ login: z.string().min(1) }),
});

export function refreshMatchesAccount(data: unknown, login: string) {
	// shortcut: opaque tokens rely on same-origin coordination until refresh supplies identity.
	if (typeof data !== "object" || data === null || !("user" in data))
		return true;
	const response = accountIdentitySchema.safeParse(data);
	return response.success && response.data.user.login === login;
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
	credentials: Credentials,
	signal: AbortSignal,
	canUseCookie: boolean,
	assertActive: () => void,
) {
	// A tab closed during login must leave no usable association.
	const previous = persistence.read();
	const canRemember = canUseCookie && persistence.beginLogin();
	try {
		const response = await http.request("/auth/login", {
			method: "POST",
			body: credentials,
			signal,
			credentials: canRemember ? "include" : "omit",
		});
		assertActive();
		const user = parseResponse(accountIdentitySchema, response).user.login;
		return { user, canRemember };
	} catch (error) {
		if (canRemember && previous && isInvalidCredentials(error)) {
			persistence.write(previous);
		} else if (canRemember) {
			persistence.clear();
		}
		throw error;
	}
}
