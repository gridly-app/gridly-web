import { z } from "zod";
import { ApiError, FetchHttpClient, parseResponse } from "@/shared/api";
import { errorMessage, type KeyValueStorage } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib/runtimeNotices";

const metadataSchema = z.object({
	session_id: z.string().min(1),
	expires_at: z.iso.datetime({ offset: true }),
	initial_warehouse_id: z.string().min(1),
});
const sessionSchema = metadataSchema.extend({
	access_token: z.string().min(1),
});
const storedSchema = sessionSchema.extend({
	last_warehouse_id: z.string().optional(),
});
export type DemoCredentials = z.infer<typeof storedSchema>;
export type DemoStatus = "idle" | "starting" | "active" | "expired" | "error";
export interface DemoSnapshot {
	status: DemoStatus;
	session: DemoCredentials | null;
	error: string;
}
const storageKey = "gridly.demo.session";

export class ServerDemoSession {
	private snapshot: DemoSnapshot;
	private listeners = new Set<() => void>();
	private operation: Promise<void> | null = null;
	private generation = 0;
	private startKey: string | null = null;
	private expiryTimer: ReturnType<typeof setTimeout> | undefined;
	readonly http: FetchHttpClient;
	private readonly anonymous: FetchHttpClient;

	constructor(
		private readonly storage: KeyValueStorage,
		private readonly baseUrl: string,
		private readonly clearData: () => void,
		private readonly transport: (
			input: RequestInfo | URL,
			init?: RequestInit | undefined,
		) => Promise<Response> = (...args) => fetch(...args),
		private readonly clearSessionForms: (sessionId: string) => void = () =>
			undefined,
	) {
		try {
			storage.removeItem("gridly.demo");
		} catch {
			runtimeNotices.report(
				"demo.legacy",
				"Не удалось удалить устаревшие данные демо. Очистите данные сайта в настройках браузера.",
			);
		}
		let session: DemoCredentials | null = null;
		try {
			const saved = storage.getItem(storageKey);
			if (saved) session = storedSchema.parse(JSON.parse(saved));
		} catch {
			this.removeSavedSession();
		}
		this.snapshot = { status: "idle", session, error: "" };
		this.anonymous = this.client(() => "");
		this.http = this.client(
			() => this.snapshot.session?.access_token ?? "",
			() => this.expire(),
		);
	}

	private client(
		accessToken: () => string,
		onUnauthorized?: (() => void) | undefined,
	) {
		return new FetchHttpClient(this.baseUrl, this.transport, {
			credentials: "omit",
			refresh: false,
			accessToken,
			onUnauthorized,
		});
	}
	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	private publish(snapshot: DemoSnapshot) {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener();
	}
	private track(work: () => Promise<void>) {
		if (this.operation) return this.operation;
		const promise = work().finally(() => {
			if (this.operation === promise) this.operation = null;
		});
		this.operation = promise;
		return promise;
	}
	private assertGeneration(generation: number) {
		if (generation !== this.generation)
			throw new DOMException("Демо-сессия изменилась", "AbortError");
	}
	private resetData() {
		this.http.clearSession();
		this.clearData();
	}
	private activate(session: DemoCredentials) {
		if (Date.parse(session.expires_at) <= Date.now())
			throw new ApiError("Демо завершено", 401);
		this.storage.setItem(storageKey, JSON.stringify(session));
		this.publish({ status: "active", session, error: "" });
		this.scheduleExpiry();
	}
	private scheduleExpiry() {
		clearTimeout(this.expiryTimer);
		const session = this.snapshot.session;
		if (!session || this.snapshot.status !== "active") return;
		const remaining = Date.parse(session.expires_at) - Date.now();
		if (remaining <= 0) {
			this.expire();
			return;
		}
		this.expiryTimer = setTimeout(
			() => this.scheduleExpiry(),
			Math.min(remaining, 2_147_483_647),
		);
	}

	restore = () => {
		if (this.snapshot.status === "active") return Promise.resolve();
		if (!this.snapshot.session) return Promise.resolve();
		return this.track(async () => {
			const generation = this.generation;
			const saved = this.snapshot.session;
			if (!saved) return;
			if (Date.parse(saved.expires_at) <= Date.now()) {
				this.expire();
				return;
			}
			this.publish({ ...this.snapshot, status: "starting", error: "" });
			try {
				const metadata = parseResponse(
					metadataSchema,
					await this.http.request("/demo/session"),
				);
				this.assertGeneration(generation);
				if (metadata.session_id !== saved.session_id)
					throw new Error("Сервер вернул другую демо-сессию");
				this.activate({ ...saved, ...metadata });
			} catch (error) {
				if (generation !== this.generation) return;
				if (error instanceof ApiError && error.status === 401) {
					this.expire();
					return;
				}
				this.publish({
					...this.snapshot,
					status: "error",
					error: errorMessage(error),
				});
			}
		});
	};

	start = (restart = false) =>
		this.track(async () => {
			if (!restart && this.snapshot.session) {
				if (this.snapshot.status === "active") return;
				throw new Error("Сначала восстановите демо-сессию");
			}
			const generation = this.generation;
			const previous = this.snapshot;
			if (!previous.session)
				this.publish({ ...previous, status: "starting", error: "" });
			this.startKey ??= crypto.randomUUID();
			let created: DemoCredentials | undefined;
			try {
				created = parseResponse(
					sessionSchema,
					await this.anonymous.request("/demo/sessions", {
						method: "POST",
						idempotencyKey: this.startKey,
					}),
				);
				this.assertGeneration(generation);
				if (Date.parse(created.expires_at) <= Date.now())
					throw new Error("Сервер вернул истёкшую демо-сессию");
				this.storage.setItem(storageKey, JSON.stringify(created));
				this.generation++;
				this.resetData();
				this.startKey = null;
				this.publish({ status: "active", session: created, error: "" });
				this.scheduleExpiry();
				if (previous.session) {
					this.clearForms(previous.session.session_id);
					void this.revoke(previous.session.access_token);
				}
			} catch (error) {
				if (created) void this.revoke(created.access_token);
				if (generation !== this.generation) throw error;
				if (created) this.startKey = null;
				this.publish({
					...previous,
					status: previous.status === "active" ? "active" : "error",
					error: errorMessage(error),
				});
				throw error;
			}
		});

	rememberWarehouse(id: string) {
		if (
			id === "new" ||
			!this.snapshot.session ||
			this.snapshot.status !== "active"
		)
			return;
		const session = { ...this.snapshot.session, last_warehouse_id: id };
		this.storage.setItem(storageKey, JSON.stringify(session));
		this.publish({ ...this.snapshot, session });
	}
	expire = () => {
		const sessionId = this.snapshot.session?.session_id;
		this.generation++;
		this.operation = null;
		this.startKey = null;
		clearTimeout(this.expiryTimer);
		this.removeSavedSession();
		this.resetData();
		this.publish({ status: "expired", session: null, error: "" });
		if (sessionId) this.clearForms(sessionId);
	};
	end = () => {
		const sessionId = this.snapshot.session?.session_id;
		const token = this.snapshot.session?.access_token;
		this.generation++;
		this.operation = null;
		clearTimeout(this.expiryTimer);
		this.removeSavedSession();
		this.startKey = null;
		this.resetData();
		this.publish({ status: "idle", session: null, error: "" });
		if (sessionId) this.clearForms(sessionId);
		if (token) void this.revoke(token);
	};
	private removeSavedSession() {
		try {
			this.storage.removeItem(storageKey);
		} catch {
			runtimeNotices.report(
				"demo.remove",
				"Не удалось удалить сохранённую демо-сессию. Очистите данные сайта перед повторным использованием демо.",
			);
		}
	}
	private clearForms(sessionId: string) {
		try {
			this.clearSessionForms(sessionId);
		} catch {
			runtimeNotices.report(
				"demo.forms",
				"Не удалось удалить сохранённые формы завершённого демо. Очистите данные сайта в настройках браузера.",
			);
		}
	}
	private async revoke(token: string) {
		if (
			this.snapshot.status === "active" &&
			this.snapshot.session?.access_token === token
		)
			return;
		try {
			await this.client(() => token).request("/demo/session", {
				method: "DELETE",
			});
		} catch {
			runtimeNotices.report(
				"demo.revoke",
				"Локальный доступ к демо завершён. Сервер не подтвердил отзыв сессии; она может действовать до истечения срока. Проверьте подключение.",
			);
		}
	}
}
