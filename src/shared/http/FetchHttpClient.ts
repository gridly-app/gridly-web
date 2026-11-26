import { readEventStream } from "@/shared/realtime";
import { ApiError } from "./ApiError";
import { parseHttpError, readHttpBody, readSessionToken } from "./httpResponse";

import { HttpReadBackoff } from "./HttpReadBackoff";
import { prepareHttpRequest } from "./prepareHttpRequest";

export type RequestOptions = {
	detached?: boolean | undefined;
	credentials?: RequestCredentials | undefined;
	method?: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE") | undefined;
	body?: unknown | undefined;
	signal?: AbortSignal | undefined;
	headers?: Record<string, string> | undefined;
	privacy?: boolean | undefined;
	idempotencyKey?: string | undefined;
	readOnly?: boolean | undefined;
};

export interface HttpClient {
	request(path: string, options?: RequestOptions | undefined): Promise<unknown>;
}

export interface StreamHttpClient extends HttpClient {
	openStream(
		path: string,
		options?: RequestOptions,
	): Promise<ReadableStream<Uint8Array>>;
}

export interface SessionHttpClient extends HttpClient {
	clearSession(): void;
}

export interface FileHttpClient extends HttpClient {
	requestFile(path: string, options?: RequestOptions): Promise<Response>;
}

export interface AuthEndpoints {
	prefix: string;
	login: string;
	refresh: string;
}

type ResponseMode = "data" | "stream" | "file";

interface PerformOptions {
	response?: ResponseMode;
	validate?: ((data: unknown) => void) | undefined;
}

export interface HttpSessionPolicy {
	auth?: AuthEndpoints | undefined;
	credentials?: RequestCredentials | undefined;
	accessToken?: (() => string) | undefined;
	refresh?: boolean | undefined;
	abortOnSessionChange?: boolean | undefined;
	onUnauthorized?: ((error: ApiError) => void) | undefined;
	withRefresh?(
		refresh: (validate: (data: unknown) => void) => Promise<unknown>,
		signal: AbortSignal,
	): Promise<unknown>;
}

export class FetchHttpClient
	implements FileHttpClient, StreamHttpClient, SessionHttpClient
{
	private token = "";
	private streamSession = new AbortController();
	private readonly readBackoff = new HttpReadBackoff();

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
		this.readBackoff.clear();
	}

	private isAuthPath(path: string) {
		const { auth } = this.policy;

		return !!auth && path.startsWith(auth.prefix);
	}

	private issuesToken(path: string) {
		const { auth } = this.policy;

		return !!auth && (path === auth.login || path === auth.refresh);
	}

	private refresh(refreshPath: string) {
		if (this.refreshRequest) {
			return this.refreshRequest;
		}
		const signal = AbortSignal.any([
			this.streamSession.signal,
			AbortSignal.timeout(15000),
		]);
		const perform = (validate?: (data: unknown) => void) =>
			this.perform(refreshPath, { method: "POST", signal }, { validate });
		const request = (
			this.policy.withRefresh?.(perform, signal) ?? perform()
		).finally(() => {
			if (this.refreshRequest === request) this.refreshRequest = null;
		});

		this.refreshRequest = request;

		return request;
	}

	async request(path: string, options: RequestOptions = {}): Promise<unknown> {
		if (path === this.policy.auth?.refresh) {
			options.signal?.throwIfAborted();
			return waitForRefresh(this.refresh(path), options.signal);
		}
		return this.perform(path, options);
	}
	async requestFile(
		path: string,
		options: RequestOptions = {},
	): Promise<Response> {
		const response = await this.perform(path, options, { response: "file" });
		if (!(response instanceof Response))
			throw new ApiError("Файл недоступен", 502, "INVALID_RESPONSE");
		return response;
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
			{ response: "stream" },
		);
		if (!(result instanceof ReadableStream))
			throw new ApiError("Поток состояния недоступен", 502, "INVALID_RESPONSE");
		return result;
	}
	private requestSignal(options: RequestOptions) {
		const signal = options.signal;

		if (!this.policy.abortOnSessionChange || options.detached) return signal;

		const sessionSignal = this.streamSession.signal;

		return signal ? AbortSignal.any([signal, sessionSignal]) : sessionSignal;
	}

	private async perform(
		path: string,
		options: RequestOptions,
		{ response: mode = "data", validate }: PerformOptions = {},
	): Promise<unknown> {
		const generation = this.sessionGeneration;
		const { method = "GET" } = options;
		const signal = this.requestSignal(options);
		const auth = this.isAuthPath(path);
		const refreshPath = this.policy.auth?.refresh;
		const readOnly = method === "GET" || options.readOnly === true;
		const [readPath = path] = path.split("?", 1);
		const token = this.policy.accessToken?.() ?? this.token;
		const credentials =
			options.credentials ??
			this.policy.credentials ??
			(auth ? "include" : "omit");
		const request = prepareHttpRequest(options, {
			method,
			credentials,
			token: auth ? "" : token,
			isPrivate: mode === "file" || !!options.privacy,
			signal,
		});
		const assertActive = () => {
			signal?.throwIfAborted();
			if (!options.detached && generation !== this.sessionGeneration) {
				throw new DOMException("Сессия завершена", "AbortError");
			}
		};
		const send = async () => {
			if (readOnly && this.readBackoff.has(readPath)) {
				const readSignal = signal
					? AbortSignal.any([signal, this.streamSession.signal])
					: this.streamSession.signal;

				await this.readBackoff.wait(readPath, readSignal);
			}

			assertActive();

			return this.transport(`${this.baseUrl}${path}`, request.build());
		};
		let response = await send();

		assertActive();
		const canRefresh =
			!auth && refreshPath !== undefined && this.policy.refresh !== false;

		if (response.status === 401 && canRefresh) {
			await waitForRefresh(this.refresh(refreshPath), signal);
			assertActive();

			if (!readOnly) {
				const data = await readHttpBody(response, assertActive);
				assertActive();
				throw parseHttpError(response, data);
			}

			request.headers.Authorization = `Bearer ${this.token}`;
			response = await send();
			assertActive();
		}
		if (mode === "stream" && response.ok)
			return readEventStream(response, assertActive);
		if (mode === "file" && response.ok) return response;
		const data = await readHttpBody(response, assertActive);

		assertActive();
		if (!response.ok) {
			const error = parseHttpError(response, data);

			if (
				readOnly &&
				(error.status === 429 || error.status === 503) &&
				error.retryAfterMs !== undefined
			) {
				this.readBackoff.defer(readPath, error.retryAfterMs);
			}

			if (response.status === 401 && (!auth || path === refreshPath))
				this.policy.onUnauthorized?.(error);
			throw error;
		}
		if (this.issuesToken(path) && !options.detached) {
			const accessToken = readSessionToken(response.status, data);
			validate?.(data);
			assertActive();
			if (path === this.policy.auth?.login) {
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
