import type { Credentials } from "@/ports/session";
import type { HttpClient } from "@/shared/http";

import { accountRegistrationPath } from "./authEndpoints";

export async function registerAccount(
	http: HttpClient,
	credentials: Credentials,
	signal: AbortSignal,
) {
	await http.request(accountRegistrationPath, {
		method: "POST",
		body: credentials,
		signal,
		credentials: "omit",
	});
}
