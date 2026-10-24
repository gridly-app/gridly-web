import { z } from "zod";
import type { HttpClient } from "@/shared/api";
import { parseResponse } from "@/shared/api";
import type { KeyValueStorage } from "@/shared/lib";

export type Credentials = { login: string; password: string };

export type AuthMode = "login" | "register";

export interface SessionRepository {
	current(): string;
	isDemo(): boolean;
	enterDemo(): Promise<void>;
	authenticate(mode: AuthMode, credentials: Credentials): Promise<string>;
	remember(user: string): void;
	clear(): Promise<void> | void;
}

export interface DemoSession {
	active(): boolean;
	start(): Promise<void>;
	stop(): Promise<void>;
}

export class BrowserSessionRepository implements SessionRepository {
	constructor(
		private readonly http: HttpClient,
		private readonly storage: KeyValueStorage,
		private readonly realApi: boolean,
		private readonly demo?: DemoSession,
	) {}

	current() {
		return this.demo?.active()
			? "demo"
			: this.storage.getItem("gridly.user") || "";
	}

	isDemo() {
		return this.demo?.active() || false;
	}

	async enterDemo() {
		if (!this.demo) {
			throw new Error("Демонстрационный режим недоступен");
		}
		await this.demo.start();
	}

	async authenticate(mode: AuthMode, credentials: Credentials) {
		if (this.realApi) {
			if (mode === "register") {
				await this.http.request("/auth/register", {
					method: "POST",
					body: credentials,
				});
			}
			const result = parseResponse(
				z.object({ user: z.object({ login: z.string() }) }),
				await this.http.request("/auth/login", {
					method: "POST",
					body: credentials,
				}),
			);

			return result.user.login;
		}

		return parseResponse(
			z.object({ login: z.string() }),
			await this.http.request(`/auth/${mode}`, {
				method: "POST",
				body: credentials,
			}),
		).login;
	}

	remember(user: string) {
		if (this.demo?.active()) {
			return;
		}
		if (!this.realApi && user === "demo") {
			this.storage.removeItem("gridly.last");
		}
		this.storage.setItem("gridly.user", user);
	}

	async clear() {
		if (this.demo?.active()) {
			await this.demo.stop();

			return;
		}
		if (this.realApi) {
			await this.http.request("/auth/logout", { method: "POST" });
		}
		this.http.clearSession?.();
		this.storage.removeItem("gridly.user");
	}
}
