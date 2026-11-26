import type { AuthMode, Credentials } from "@/ports/session";
import { ApiError, type HttpClient } from "@/shared/http";
import {
	createSnapshotStore,
	errorMessage,
	type KeyValueStorage,
	runtimeNotices,
	type SnapshotStore,
} from "@/shared/lib";

import { refreshMatchesAccount } from "./accountIdentity";
import { type AccountLock, browserAccountLock } from "./accountLock";
import { isInvalidCredentials, loginAccount } from "./accountLogin";
import { logoutAccount } from "./accountLogout";
import {
	changedSessionMessage,
	expiredSessionMessage,
	sessionChangedError,
	unconfirmedLogoutMessage,
	unconfirmedLogoutNotice,
} from "./accountMessages";
import { type Account, AccountPersistence } from "./accountPersistence";
import { registerAccount } from "./accountRegistration";
import type { AccountSnapshot } from "./accountSnapshot";
import { accountAuthEndpoints } from "./authEndpoints";

const authTimeoutMs = 15_000;

export class BrowserSessionRepository {
	private readonly store: SnapshotStore<AccountSnapshot>;

	private readonly persistence: AccountPersistence;

	private account: Account | null;

	private generation = 0;

	private restoration: Promise<void> | null = null;

	private revocation: Promise<void> | null = null;

	constructor(
		private readonly http: HttpClient,
		storage: KeyValueStorage,
		private readonly clearData: () => void = () => undefined,
		private readonly lock = browserAccountLock,
		tabStorage?: KeyValueStorage,
	) {
		this.persistence = new AccountPersistence(storage, tabStorage);
		this.account = lock ? this.persistence.restore() : null;

		const user = this.account?.login ?? "";

		this.store = createSnapshotStore<AccountSnapshot>(
			{
				user,
				status: user ? "restoring" : "ended",
				error: "",
				scopeId: this.generation,
				sessionId: this.account?.id ?? null,
			},
			{
				onFirstSubscribe: () => {
					if (typeof window !== "undefined")
						window.addEventListener("storage", this.handleStorage);
				},
				onLastUnsubscribe: () => {
					if (typeof window !== "undefined")
						window.removeEventListener("storage", this.handleStorage);
				},
			},
		);
	}

	getSnapshot = () => this.store.getSnapshot();

	subscribe = (listener: () => void) => this.store.subscribe(listener);

	current() {
		return this.snapshot.status === "active" ? this.snapshot.user : "";
	}

	withRefresh = (
		refresh: (validate: (data: unknown) => void) => Promise<unknown>,
		signal: AbortSignal,
	) => {
		const account = this.account;

		const refreshAccount = () => {
			signal.throwIfAborted();

			const isCurrentAccount = !!account && account === this.account;

			if (!isCurrentAccount || !this.persistence.matches(account)) {
				if (account === this.account) this.end(changedSessionMessage);

				throw sessionChangedError();
			}

			return refresh((data) => {
				if (refreshMatchesAccount(data, account.login)) return;

				this.expire(changedSessionMessage);

				throw sessionChangedError();
			});
		};

		return this.lock
			? this.lock(refreshAccount, signal)
			: Promise.resolve().then(refreshAccount);
	};

	restore = (): Promise<void> => {
		if (this.restoration) return this.restoration;

		if (!this.snapshot.user || this.snapshot.status === "active")
			return Promise.resolve();

		const generation = this.generation;

		this.store.publish({ ...this.snapshot, status: "restoring", error: "" });

		const work = this.http
			.request(accountAuthEndpoints.refresh, { method: "POST" })
			.then(() => {
				if (generation === this.generation)
					this.store.publish({ ...this.snapshot, status: "active" });
			})
			.catch((error: unknown) => {
				if (generation !== this.generation) return;

				if (error instanceof ApiError && error.status === 401) {
					this.expire();

					return;
				}

				this.store.publish({
					...this.snapshot,
					status: "error",
					error: errorMessage(error),
				});
			})
			.finally(() => {
				if (this.restoration === work) this.restoration = null;
			});

		this.restoration = work;

		return work;
	};

	async authenticate(mode: AuthMode, credentials: Credentials) {
		await this.revocation;

		const generation = ++this.generation;
		const signal = AbortSignal.timeout(authTimeoutMs);

		const assertActive = () => {
			signal.throwIfAborted();

			if (generation !== this.generation)
				throw new DOMException("Сессия изменилась", "AbortError");
		};

		const signIn = async () => {
			assertActive();

			if (mode === "register") {
				await registerAccount(this.http, credentials, signal);
				assertActive();
			}

			const { user, canRemember } = await loginAccount(
				this.http,
				this.persistence,
				{
					credentials,
					signal,
					canUseCookie: Boolean(this.lock),
					assertActive,
				},
			).catch((error: unknown) => {
				if (!isInvalidCredentials(error) && generation === this.generation)
					this.end();

				throw error;
			});

			assertActive();
			this.clearData();
			this.account = canRemember ? this.persistence.remember(user) : null;
			this.store.publish({
				user,
				status: "active",
				error: "",
				scopeId: generation,
				sessionId: this.account?.id ?? null,
			});

			return user;
		};

		return this.lock ? this.lock(signIn, signal) : signIn();
	}

	expire = (message = expiredSessionMessage) => {
		const account = this.account;

		this.end(message);

		if (!account || !this.lock) return;

		void this.lock(async () => {
			if (this.persistence.matches(account)) this.persistence.clear();
		}).catch(() => undefined);
	};

	clear() {
		const account = this.account;

		if (account) this.persistence.endInTab(account);

		this.end();

		if (!account || !this.lock) return;

		const revoke = this.revokeOnServer(account, this.lock).finally(() => {
			if (this.revocation === revoke) this.revocation = null;
		});

		this.revocation = revoke;

		return revoke;
	}

	private get snapshot() {
		return this.store.getSnapshot();
	}

	private handleStorage = (event: StorageEvent) => {
		const isOtherAccount =
			!!this.account && !this.persistence.matches(this.account);

		if (this.persistence.isChange(event) && isOtherAccount)
			this.end(changedSessionMessage);
	};

	private revokeOnServer(account: Account, lock: AccountLock) {
		const generation = this.generation;
		const signal = AbortSignal.timeout(authTimeoutMs);

		return logoutAccount(this.http, this.persistence, lock, {
			account,
			signal,
		}).catch(() => {
			if (generation !== this.generation) return;

			runtimeNotices.report("account.revoke", unconfirmedLogoutNotice);
			this.store.publish({ ...this.snapshot, error: unconfirmedLogoutMessage });
		});
	}

	private end(error = "") {
		this.account = null;
		this.generation++;
		this.http.clearSession?.();
		this.clearData();
		this.store.publish({
			user: "",
			status: "ended",
			error,
			scopeId: this.generation,
			sessionId: null,
		});
	}
}
