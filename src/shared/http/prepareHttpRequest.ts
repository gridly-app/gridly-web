import type { RequestOptions } from "./FetchHttpClient";

export function prepareHttpRequest(
	options: RequestOptions,
	{
		method,
		credentials,
		token,
		isPrivate,
		signal,
	}: {
		method: NonNullable<RequestOptions["method"]>;
		credentials: RequestCredentials;
		token: string;
		isPrivate: boolean;
		signal: AbortSignal | undefined;
	},
) {
	const { body } = options;
	const headers: Record<string, string> = { ...options.headers };
	const isForm = body instanceof FormData;

	if (body !== undefined && !isForm)
		headers["Content-Type"] = "application/json";
	if (token) headers.Authorization = `Bearer ${token}`;
	if (options.idempotencyKey)
		headers["Idempotency-Key"] = options.idempotencyKey;
	function build(): RequestInit {
		const request: RequestInit = { method, headers, credentials };

		if (signal) request.signal = signal;
		if (body !== undefined) request.body = isForm ? body : JSON.stringify(body);

		if (isPrivate) {
			request.redirect = "error";
			request.cache = "no-store";
			request.referrerPolicy = "no-referrer";
		}

		return request;
	}

	return { headers, build };
}
