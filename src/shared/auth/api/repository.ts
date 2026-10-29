import { z } from "zod";
import { ApiError, type HttpClient, parseResponse } from "@/shared/api";
import { errorMessage, type KeyValueStorage } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib/runtimeNotices";

export type Credentials = { login: string; password: string };

export type AuthMode = "login" | "register";

export interface AccountSnapshot {
	status: "restoring" | "active" | "ended" | "error";
	user: string;
	error: string;
}

export interface SessionRepository {
	current(): string;
	authenticate(mode: AuthMode, credentials: Credentials): Promise<string>;
	remember(user: string): void;
	clear(): Promise<void> | void;
	restore(): Promise<void>;
	expire(): void;
	getSnapshot(): AccountSnapshot;
	subscribe(listener: () => void): () => void;
}

export class BrowserSessionRepository implements SessionRepository {
	private snapshot: AccountSnapshot;
	private listeners = new Set<() => void>();
	private generation = 0;
	private restoration: Promise<void> | null = null;
	private revocation: Promise<void> | null = null;
	constructor(
		private readonly http: HttpClient,
		private readonly storage: KeyValueStorage,
		private readonly clearData: () => void = () => undefined,
	) {
		let user = "";
		try {
			user = storage.getItem("gridly.user") ?? "";
		} catch {
			runtimeNotices.report(
				"account.read",
				"Не удалось восстановить сохранённый вход. Войдите в аккаунт снова.",
			);
		}
		this.snapshot = { user, status: user ? "restoring" : "ended", error: "" };
	}
	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
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
		if (mode === "register")
			await this.http.request("/auth/register", {
				method: "POST",
				body: credentials,
			});
		const user = parseResponse(
			z.object({ user: z.object({ login: z.string() }) }),
			await this.http.request("/auth/login", {
				method: "POST",
				body: credentials,
			}),
		).user.login;
		if (generation !== this.generation)
			throw new DOMException("Сессия изменилась", "AbortError");
		this.clearData();
		this.remember(user);
		return user;
	}
	remember(user: string) {
		try {
			this.storage.setItem("gridly.user", user);
		} catch {
			runtimeNotices.report(
				"account.write",
				"Вход выполнен, но не сохранён в браузере. После перезагрузки может потребоваться повторный вход.",
			);
		}
		this.publish({ user, status: "active", error: "" });
	}
	expire = () => {
		this.generation++;
		this.http.clearSession?.();
		this.clearData();
		try {
			this.storage.removeItem("gridly.user");
		} catch {
			runtimeNotices.report(
				"account.remove",
				"Локальный выход выполнен, но сохранённые данные входа не удалены. Очистите данные сайта в браузере.",
			);
		}
		this.publish({ user: "", status: "ended", error: "" });
	};
	clear() {
		const work = this.http.request("/auth/logout", {
			method: "POST",
			detached: true,
		});
		this.expire();
		const generation = this.generation;
		const revoke = work
			.then(() => undefined)
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
	}
}
