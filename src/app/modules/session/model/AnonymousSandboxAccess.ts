import { ApiError, FetchHttpClient, parseResponse } from "@/shared/http";
import {
	errorMessage,
	type KeyValueStorage,
	runtimeNotices,
} from "@/shared/lib";
import {
	sandboxAccessSchema,
	sandboxMetadataSchema,
} from "../api/sandboxAccess";
import {
	type SandboxAccessData,
	SandboxAccessStorage,
} from "./sandboxAccessStorage";

export type { SandboxAccessData } from "./sandboxAccessStorage";

export type SandboxStatus =
	"idle" | "starting" | "active" | "expired" | "error";

export interface SandboxSnapshot {
	status: SandboxStatus;
	access: SandboxAccessData | null;
	error: string;
}

export class AnonymousSandboxAccess {
	private snapshot: SandboxSnapshot;
	private readonly storage: SandboxAccessStorage;
	private listeners = new Set<() => void>();
	private operation: Promise<void> | null = null;
	private generation = 0;
	private startKey: string | null = null;
	readonly http: FetchHttpClient;
	private readonly anonymous: FetchHttpClient;

	constructor(
		storage: KeyValueStorage,
		private readonly baseUrl: string,
		private readonly clearData: (accessId: string | undefined) => void,
		private readonly transport: (
			input: RequestInfo | URL,
			init?: RequestInit | undefined,
		) => Promise<Response> = (...args) => fetch(...args),
	) {
		this.storage = new SandboxAccessStorage(storage);
		this.snapshot = { status: "idle", access: this.storage.load(), error: "" };
		this.anonymous = this.client(() => "");
		this.http = this.client(
			() => this.snapshot.access?.access_token ?? "",
			(error) => {
				if (error.code === "SESSION_EXPIRED" || !error.code) this.expire();
			},
		);
	}

	private client(
		accessToken: () => string,
		onUnauthorized?: ((error: ApiError) => void) | undefined,
	) {
		return new FetchHttpClient(this.baseUrl, this.transport, {
			credentials: "omit",
			refresh: false,
			abortOnSessionChange: true,
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
	private publish(snapshot: SandboxSnapshot) {
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
			throw new DOMException("Срок анонимного доступа изменился", "AbortError");
	}
	private resetData() {
		this.http.clearSession();
		this.clearData(this.snapshot.access?.access_id);
	}
	restore = () => {
		if (this.snapshot.status === "active") return Promise.resolve();
		if (!this.snapshot.access) return Promise.resolve();
		return this.track(async () => {
			const generation = this.generation;
			try {
				await this.restoreSavedAccess(generation);
			} catch (error) {
				if (generation !== this.generation) return;
				this.publish({
					...this.snapshot,
					status: "error",
					error: errorMessage(error),
				});
			}
		});
	};

	private async restoreSavedAccess(generation: number) {
		const saved = this.snapshot.access;
		if (!saved) return;
		this.publish({ ...this.snapshot, status: "starting", error: "" });
		const metadata = await this.client(() => saved.access_token)
			.request("/sandbox/access", { privacy: true })
			.then((response) => parseResponse(sandboxMetadataSchema, response))
			.catch((error: unknown) => {
				if (error instanceof ApiError && error.status === 401) return null;
				throw error;
			});
		this.assertGeneration(generation);
		if (metadata?.access_id !== saved.access_id) {
			this.storage.remove();
			this.resetData();
			this.publish({ status: "expired", access: null, error: "" });
			return;
		}
		const access = { ...saved, ...metadata };
		this.storage.save(access);
		this.publish({ status: "active", access, error: "" });
	}

	start = (restart = false) =>
		this.track(async () => {
			const generation = this.generation;
			let previous = this.snapshot;
			let created: SandboxAccessData | undefined;
			try {
				if (!restart && previous.access) {
					if (previous.status === "active") return;
					await this.restoreSavedAccess(generation);
					this.assertGeneration(generation);
					previous = this.snapshot;
					if (previous.access) return;
				}
				if (!previous.access)
					this.publish({ ...previous, status: "starting", error: "" });
				this.startKey ??= crypto.randomUUID();
				created = parseResponse(
					sandboxAccessSchema,
					await this.anonymous.request("/sandbox/access", {
						method: "POST",
						idempotencyKey: this.startKey,
					}),
				);
				this.assertGeneration(generation);
				this.storage.save(created);
				this.generation++;
				this.resetData();
				this.startKey = null;
				this.publish({ status: "active", access: created, error: "" });
				if (previous.access) {
					void this.revoke(previous.access.access_token);
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
			!this.snapshot.access ||
			this.snapshot.status !== "active"
		)
			return;
		const access = { ...this.snapshot.access, last_warehouse_id: id };
		this.storage.save(access);
		this.publish({ ...this.snapshot, access });
	}
	expire = () => {
		this.generation++;
		this.operation = null;
		this.startKey = null;
		this.storage.remove();
		this.resetData();
		this.publish({ status: "expired", access: null, error: "" });
	};
	end = () => {
		const token = this.snapshot.access?.access_token;
		this.generation++;
		this.operation = null;
		this.storage.remove();
		this.startKey = null;
		this.resetData();
		this.publish({ status: "idle", access: null, error: "" });
		if (token) void this.revoke(token);
	};
	private async revoke(token: string) {
		if (
			this.snapshot.status === "active" &&
			this.snapshot.access?.access_token === token
		)
			return;
		try {
			await this.client(() => token).request("/sandbox/access", {
				method: "DELETE",
			});
		} catch {
			runtimeNotices.report(
				"sandbox.revoke",
				"Локальный доступ к песочнице завершён. Сервер не подтвердил отзыв токена. Проверьте подключение.",
			);
		}
	}
}
