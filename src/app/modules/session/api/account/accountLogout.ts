import type { HttpClient } from "@/shared/http";

import type { AccountLock } from "./accountLock";
import type { Account, AccountPersistence } from "./accountPersistence";
import { accountLogoutPath } from "./authEndpoints";

export function logoutAccount(
	http: HttpClient,
	persistence: AccountPersistence,
	lock: AccountLock,
	{ account, signal }: { account: Account; signal: AbortSignal },
) {
	return lock(async () => {
		if (!persistence.matches(account)) return;

		persistence.clear();
		await http.request(accountLogoutPath, {
			method: "POST",
			detached: true,
			signal,
		});
	}, signal);
}
