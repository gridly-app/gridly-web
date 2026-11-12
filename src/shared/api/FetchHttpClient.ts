import { ApiError } from "./ApiError";
import { parseHttpError, readHttpBody, readSessionToken } from "./httpResponse";
import { readEventStream } from "./readEventStream";

export type RequestOptions = {
	detached?: boolean | undefined;
	credentials?: RequestCredentials | undefined;
	method?: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE") | undefined;
	body?: unknown | undefined;
	signal?: AbortSignal | undefined;
	headers?: Record<string, string> | undefined;
	idempotencyKey?: string | undefined;
};

export interface HttpClient {
	openStream?(
		path: string,
		options?: RequestOptions,
	): Promise<ReadableStream<Uint8Array>>;
	clearSession?(): void;
	request(path: string, options?: RequestOptions | undefined): Promise<unknown>;
}

export interface HttpSessionPolicy {
	credentials?: RequestCredentials | undefined;
	accessToken?: (() => string) | undefined;
	refresh?: boolean | undefined;
	onUnauthorized?: (() => void) | undefined;
	withRefresh?(
		refresh: (validate: (data: unknown) => void) => Promise<unknown>,
		signal: AbortSignal,
	): Promise<unknown>;
}

export class FetchHttpClient implements HttpClient {
	private token = "";
	private streamSession = new AbortController();

	private sessionGeneration = 0;

	private refreshRequest: Promise<unknown> | null = null;

	constructor(
		private readonly baseUrl = "/api/v1",
		private readonly transport: (
			input: RequestInfo | URL,
			init?: RequestInit | undefined,
		) => Promise<Response> = (...args) => fetch(...args),
		private readonly policy: HttpSessionPolicy = {},
	) {}

	clearSession() {
		this.streamSession.abort();
		this.streamSession = new AbortController();
		this.sessionGeneration++;
		this.token = "";
		this.refreshRequest = null;
	}

	private refresh() {
		if (this.refreshRequest) {
			return this.refreshRequest;
		}
		const signal = AbortSignal.any([
			this.streamSession.signal,
			AbortSignal.timeout(15000),
		]);
		const perform = (validate?: (data: unknown) => void) =>
			this.perform(
				"/auth/refresh",
				{ method: "POST", signal },
				false,
				validate,
			);
		const request = (
			this.policy.withRefresh?.(perform, signal) ?? perform()
		).finally(() => {
			if (this.refreshRequest === request) this.refreshRequest = null;
		});

		this.refreshRequest = request;

		return request;
	}

	async request(path: string, options: RequestOptions = {}): Promise<unknown> {
		if (path === "/auth/refresh") {
			options.signal?.throwIfAborted();
			return waitForRefresh(this.refresh(), options.signal);
		}
		return this.perform(path, options);
	}
	async openStream(
		path: string,
		options: RequestOptions = {},
	): Promise<ReadableStream<Uint8Array>> {
		const signal = options.signal
			? AbortSignal.any([options.signal, this.streamSession.signal])
			: this.streamSession.signal;
		const result = await this.perform(
			path,
			{
				...options,
				signal,
				headers: { ...options.headers, Accept: "text/event-stream" },
			},
			true,
		);
		if (!(result instanceof ReadableStream))
			throw new ApiError("Поток состояния недоступен", 502, "INVALID_RESPONSE");
		return result;
	}
	private async perform(
		path: string,
		options: RequestOptions,
		streaming = false,
		validate?: (data: unknown) => void,
	): Promise<unknown> {
		const generation = this.sessionGeneration;
		const { method = "GET", body, signal } = options;
		const auth = path.startsWith("/auth/");
		const issuesToken = path === "/auth/login" || path === "/auth/refresh";
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
				credentials:
					options.credentials ??
					this.policy.credentials ??
					(auth ? "include" : "omit"),
				...(signal ? { signal } : {}),
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			});
		};
		let response = await send();

		assertActive();
		if (response.status === 401 && !auth && this.policy.refresh !== false) {
			await waitForRefresh(this.refresh(), signal);
			assertActive();
			headers.Authorization = `Bearer ${this.token}`;
			response = await send();
			assertActive();
		}
		if (streaming && response.ok)
			return readEventStream(response, assertActive);
		const data = await readHttpBody(response, assertActive);

		assertActive();
		if (!response.ok) {
			if (response.status === 401 && (!auth || path === "/auth/refresh"))
				this.policy.onUnauthorized?.();
			throw parseHttpError(response.status, data);
		}
		if (issuesToken && !options.detached) {
			const accessToken = readSessionToken(response.status, data);
			validate?.(data);
			assertActive();
			if (path === "/auth/login") {
				this.sessionGeneration++;
				this.refreshRequest = null;
			}
			this.token = accessToken;
		}

		return data;
	}
}

async function waitForRefresh(refresh: Promise<unknown>, signal?: AbortSignal) {
	if (!signal) return refresh;

	return new Promise<unknown>((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		refresh.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", abort);
		});
		if (signal.aborted) abort();
	});
}
