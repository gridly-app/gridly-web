import { ApiError, type HttpClient } from "@/shared/api";
import {
	errorMessage,
	type KeyValueStorage,
	runtimeNotices,
} from "@/shared/lib";
import {
	type Credentials,
	isInvalidCredentials,
	loginAccount,
	refreshMatchesAccount,
} from "./accountLogin";
import {
	type Account,
	AccountPersistence,
	browserAccountLock,
} from "./accountPersistence";

export type { Credentials } from "./accountLogin";

export type AuthMode = "login" | "register";

export interface AccountSnapshot {
	status: "restoring" | "active" | "ended" | "error";
	user: string;
	error: string;
}

export interface SessionRepository {
	current(): string;
	authenticate(mode: AuthMode, credentials: Credentials): Promise<string>;
	clear(): Promise<void> | void;
	restore(): Promise<void>;
	expire(): void;
	getSnapshot(): AccountSnapshot;
	subscribe(listener: () => void): () => void;
}

const changedSessionMessage = "Аккаунт в браузере изменился. Войдите снова.";

export class BrowserSessionRepository implements SessionRepository {
	private snapshot: AccountSnapshot;
	private account: Account | null;
	private readonly persistence: AccountPersistence;
	private listeners = new Set<() => void>();
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
		this.snapshot = { user, status: user ? "restoring" : "ended", error: "" };
	}
	getSnapshot = () => this.snapshot;
	private onStorage = (event: StorageEvent) => {
		if (
			this.persistence.isChange(event) &&
			this.account &&
			!this.persistence.matches(this.account)
		) {
			this.end(changedSessionMessage);
		}
	};
	subscribe = (listener: () => void) => {
		if (!this.listeners.size && typeof window !== "undefined") {
			window.addEventListener("storage", this.onStorage);
		}
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
			if (!this.listeners.size && typeof window !== "undefined") {
				window.removeEventListener("storage", this.onStorage);
			}
		};
	};
	withRefresh = (
		refresh: (validate: (data: unknown) => void) => Promise<unknown>,
		signal: AbortSignal,
	) => {
		const account = this.account;
		const refreshAccount = () => {
			signal.throwIfAborted();
			if (
				!account ||
				account !== this.account ||
				!this.persistence.matches(account)
			) {
				if (account === this.account) this.end(changedSessionMessage);
				throw new ApiError(changedSessionMessage, 401, "SESSION_CHANGED");
			}
			return refresh((data) => {
				if (refreshMatchesAccount(data, account.login)) return;
				this.expire(changedSessionMessage);
				throw new ApiError(changedSessionMessage, 401, "SESSION_CHANGED");
			});
		};
		return this.lock
			? this.lock(refreshAccount, signal)
			: Promise.resolve().then(refreshAccount);
	};
	private publish(snapshot: AccountSnapshot) {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener();
	}
	current() {
		return this.snapshot.status === "active" ? this.snapshot.user : "";
	}
	restore = (): Promise<void> => {
		if (this.restoration) return this.restoration;
		if (!this.snapshot.user || this.snapshot.status === "active")
			return Promise.resolve();
		const generation = this.generation;
		this.publish({ ...this.snapshot, status: "restoring", error: "" });
		const work = this.http
			.request("/auth/refresh", { method: "POST" })
			.then(() => {
				if (generation === this.generation)
					this.publish({ ...this.snapshot, status: "active" });
			})
			.catch((error: unknown) => {
				if (generation !== this.generation) return;
				if (error instanceof ApiError && error.status === 401) this.expire();
				else
					this.publish({
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
		const signal = AbortSignal.timeout(15000);
		const assertActive = () => {
			signal.throwIfAborted();
			if (generation !== this.generation)
				throw new DOMException("Сессия изменилась", "AbortError");
		};
		const signIn = async () => {
			assertActive();
			if (mode === "register") {
				await this.http.request("/auth/register", {
					method: "POST",
					body: credentials,
					signal,
					credentials: "omit",
				});
				assertActive();
			}
			const { user, canRemember } = await loginAccount(
				this.http,
				this.persistence,
				credentials,
				signal,
				Boolean(this.lock),
				assertActive,
			).catch((error: unknown) => {
				if (!isInvalidCredentials(error) && generation === this.generation)
					this.end();
				throw error;
			});
			assertActive();
			this.clearData();
			this.account = canRemember ? this.persistence.remember(user) : null;
			this.publish({ user, status: "active", error: "" });
			return user;
		};
		return this.lock ? this.lock(signIn, signal) : signIn();
	}

	private end(error = "") {
		this.account = null;
		this.generation++;
		this.http.clearSession?.();
		this.clearData();
		this.publish({ user: "", status: "ended", error });
	}
	expire = (message = "Сеанс завершён. Войдите снова.") => {
		const account = this.account;
		this.end(message);
		if (account && this.lock) {
			void this.lock(async () => {
				if (this.persistence.matches(account)) this.persistence.clear();
			}).catch(() => undefined);
		}
	};
	clear() {
		const account = this.account;
		if (account) this.persistence.endInTab(account);
		this.end();
		if (!account || !this.lock) return;
		const generation = this.generation;
		const signal = AbortSignal.timeout(15000);
		const revoke = this.lock(async () => {
			if (!this.persistence.matches(account)) return;
			this.persistence.clear();
			await this.http.request("/auth/logout", {
				method: "POST",
				detached: true,
				signal,
			});
		}, signal)
			.catch(() => {
				if (generation === this.generation) {
					runtimeNotices.report(
						"account.revoke",
						"Локальный выход выполнен. Сервер не подтвердил завершение сессии. Проверьте подключение и повторите выход после входа.",
					);
					this.publish({
						...this.snapshot,
						error:
							"Локальный выход выполнен. Серверное завершение не подтверждено.",
					});
				}
			})
			.finally(() => {
				if (this.revocation === revoke) this.revocation = null;
			});
		this.revocation = revoke;
		return revoke;
	}
}
