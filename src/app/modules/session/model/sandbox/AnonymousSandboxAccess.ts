import { newWarehouseId } from "@/ports/navigation";
import { ApiError, FetchHttpClient, parseResponse } from "@/shared/http";
import {
	createSnapshotStore,
	errorMessage,
	type KeyValueStorage,
	runtimeNotices,
	type SnapshotStore,
} from "@/shared/lib";

import {
	sandboxAccessSchema,
	sandboxMetadataSchema,
} from "../../api/sandboxAccess";
import {
	type SandboxAccessData,
	SandboxAccessStorage,
} from "./sandboxAccessStorage";
import type { SandboxSnapshot, SandboxTransport } from "./sandboxSnapshot";

const sandboxAccessPath = "/sandbox/access";

function isExpiredAccess(error: ApiError) {
	return error.code === "SESSION_EXPIRED" || !error.code;
}

export class AnonymousSandboxAccess {
	readonly http: FetchHttpClient;

	private readonly anonymous: FetchHttpClient;

	private readonly storage: SandboxAccessStorage;

	private readonly store: SnapshotStore<SandboxSnapshot>;

	private operation: Promise<void> | null = null;

	private generation = 0;

	private startKey: string | null = null;

	constructor(
		storage: KeyValueStorage,
		private readonly baseUrl: string,
		private readonly clearData: (accessId: string | undefined) => void,
		private readonly transport: SandboxTransport = (...args) => fetch(...args),
	) {
		this.storage = new SandboxAccessStorage(storage);
		this.store = createSnapshotStore<SandboxSnapshot>({
			status: "idle",
			access: this.storage.load(),
			error: "",
		});
		this.anonymous = this.client(() => "");
		this.http = this.client(
			() => this.snapshot.access?.access_token ?? "",
			(error) => {
				if (isExpiredAccess(error)) this.expire();
			},
		);
	}

	getSnapshot = () => this.store.getSnapshot();

	subscribe = (listener: () => void) => this.store.subscribe(listener);

	restore = () => {
		if (this.snapshot.status === "active" || !this.snapshot.access)
			return Promise.resolve();

		return this.track(async () => {
			const generation = this.generation;

			try {
				await this.restoreSavedAccess(generation);
			} catch (error) {
				if (generation !== this.generation) return;

				this.store.publish({
					...this.snapshot,
					status: "error",
					error: errorMessage(error),
				});
			}
		});
	};

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
					this.store.publish({ ...previous, status: "starting", error: "" });

				created = await this.createAccess();
				this.assertGeneration(generation);
				this.activate(created);

				if (previous.access) void this.revoke(previous.access.access_token);
			} catch (error) {
				if (created) void this.revoke(created.access_token);

				if (generation !== this.generation) throw error;

				if (created) this.startKey = null;

				this.store.publish({
					...previous,
					status: previous.status === "active" ? "active" : "error",
					error: errorMessage(error),
				});

				throw error;
			}
		});

	rememberWarehouse(id: string) {
		const access = this.snapshot.access;
		const canRemember =
			id !== newWarehouseId && !!access && this.snapshot.status === "active";

		if (!canRemember) return;

		const updated = { ...access, last_warehouse_id: id };

		this.storage.save(updated);
		this.store.publish({ ...this.snapshot, access: updated });
	}

	expire = () => {
		this.discardAccess("expired");
	};

	end = () => {
		const token = this.snapshot.access?.access_token;

		this.discardAccess("idle");

		if (token) void this.revoke(token);
	};

	private get snapshot() {
		return this.store.getSnapshot();
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

	private async restoreSavedAccess(generation: number) {
		const saved = this.snapshot.access;

		if (!saved) return;

		this.store.publish({ ...this.snapshot, status: "starting", error: "" });

		const metadata = await this.client(() => saved.access_token)
			.request(sandboxAccessPath, { privacy: true })
			.then((response) => parseResponse(sandboxMetadataSchema, response))
			.catch((error: unknown) => {
				if (error instanceof ApiError && error.status === 401) return null;

				throw error;
			});

		this.assertGeneration(generation);

		if (metadata?.access_id !== saved.access_id) {
			this.storage.remove();
			this.resetData();
			this.store.publish({ status: "expired", access: null, error: "" });

			return;
		}

		const access = { ...saved, ...metadata };

		this.storage.save(access);
		this.store.publish({ status: "active", access, error: "" });
	}

	private async createAccess() {
		this.startKey ??= crypto.randomUUID();

		const response = await this.anonymous.request(sandboxAccessPath, {
			method: "POST",
			idempotencyKey: this.startKey,
		});

		return parseResponse(sandboxAccessSchema, response);
	}

	private activate(access: SandboxAccessData) {
		this.storage.save(access);
		this.generation++;
		this.resetData();
		this.startKey = null;
		this.store.publish({ status: "active", access, error: "" });
	}

	private discardAccess(status: "expired" | "idle") {
		this.generation++;
		this.operation = null;
		this.startKey = null;
		this.storage.remove();
		this.resetData();
		this.store.publish({ status, access: null, error: "" });
	}

	private async revoke(token: string) {
		const isCurrentToken =
			this.snapshot.status === "active" &&
			this.snapshot.access?.access_token === token;

		if (isCurrentToken) return;

		try {
			await this.client(() => token).request(sandboxAccessPath, {
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
