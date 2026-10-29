import { ApiError } from "./ApiError";

export type RequestOptions = {
	detached?: boolean | undefined;
	method?: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE") | undefined;
	body?: unknown | undefined;
	signal?: AbortSignal | undefined;
	headers?: Record<string, string> | undefined;
	idempotencyKey?: string | undefined;
};

export interface HttpClient {
	clearSession?(): void;
	request(path: string, options?: RequestOptions | undefined): Promise<unknown>;
}

export interface HttpSessionPolicy {
	credentials?: RequestCredentials | undefined;
	accessToken?: (() => string) | undefined;
	refresh?: boolean | undefined;
	onUnauthorized?: (() => void) | undefined;
}

export class FetchHttpClient implements HttpClient {
	private token = "";

	private sessionGeneration = 0;

	private refreshRequest: Promise<void> | null = null;

	constructor(
		private readonly baseUrl = "/api/v1",
		private readonly transport: (
			input: RequestInfo | URL,
			init?: RequestInit | undefined,
		) => Promise<Response> = (...args) => fetch(...args),
		private readonly policy: HttpSessionPolicy = {},
	) {}

	clearSession() {
		this.sessionGeneration++;
		this.token = "";
		this.refreshRequest = null;
	}

	private async refresh() {
		if (this.refreshRequest) {
			return this.refreshRequest;
		}
		const request = this.request("/auth/refresh", {
			method: "POST",
		})
			.then(() => undefined)
			.finally(() => {
				if (this.refreshRequest === request) {
					this.refreshRequest = null;
				}
			});

		this.refreshRequest = request;

		return request;
	}

	async request(path: string, options: RequestOptions = {}): Promise<unknown> {
		const generation = this.sessionGeneration;
		const { method = "GET", body, signal } = options;
		const auth = path.startsWith("/auth/");
		const headers: Record<string, string> = { ...options.headers };

		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
		}
		const token = this.policy.accessToken?.() ?? this.token;
		if (!auth && token) headers.Authorization = `Bearer ${token}`;
		if (options.idempotencyKey) {
			headers["Idempotency-Key"] = options.idempotencyKey;
		}
		const assertActive = () => {
			signal?.throwIfAborted();
			if (!options.detached && generation !== this.sessionGeneration) {
				throw new DOMException("Сессия завершена", "AbortError");
			}
		};
		const send = () => {
			assertActive();

			return this.transport(`${this.baseUrl}${path}`, {
				method,
				headers,
				credentials: this.policy.credentials ?? "include",
				...(signal ? { signal } : {}),
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			});
		};
		let response = await send();

		assertActive();
		if (response.status === 401 && !auth && this.policy.refresh !== false) {
			await this.refresh();
			assertActive();
			headers.Authorization = `Bearer ${this.token}`;
			response = await send();
			assertActive();
		}
		if (response.status === 204) {
			return undefined;
		}
		const data: unknown = await response.json().catch(() => {
			assertActive();
			if (response.ok) {
				throw new ApiError(
					"Сервер вернул некорректный JSON",
					response.status,
					"INVALID_RESPONSE",
				);
			}

			return null;
		});

		assertActive();
		if (!response.ok) {
			if (response.status === 401 && (!auth || path === "/auth/refresh"))
				this.policy.onUnauthorized?.();
			const envelope = isRecord(data) ? data : {};
			const error = isRecord(envelope.error) ? envelope.error : envelope;

			throw new ApiError(
				textField(error.message) ||
					textField(envelope.message) ||
					"Не удалось выполнить запрос",
				response.status,
				textField(error.code) || textField(envelope.code),
				error.details ?? envelope.details,
				textField(envelope.request_id) || textField(error.request_id),
			);
		}
		if (path === "/auth/refresh") {
			if (
				!isRecord(data) ||
				typeof data.access_token !== "string" ||
				!data.access_token
			) {
				throw new ApiError(
					"Сервер не вернул токен сессии",
					response.status,
					"INVALID_RESPONSE",
				);
			}
		}
		if (
			auth &&
			!options.detached &&
			isRecord(data) &&
			typeof data.access_token === "string"
		) {
			if (path === "/auth/login") {
				this.sessionGeneration++;
				this.refreshRequest = null;
			}
			this.token = data.access_token;
		}

		return data;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textField(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}
