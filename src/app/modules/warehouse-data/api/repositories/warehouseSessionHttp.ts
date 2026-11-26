import type { RequestOptions, StreamHttpClient } from "@/shared/http";

export function warehouseSessionHttp(
	http: StreamHttpClient,
	getSessionSignal: () => AbortSignal,
): StreamHttpClient {
	function withSession(options: RequestOptions) {
		const session = getSessionSignal();
		const signal = options.signal
			? AbortSignal.any([options.signal, session])
			: session;

		return { ...options, signal };
	}

	return {
		request: async (path, options = {}) => {
			const request = withSession(options);
			const result = await http.request(path, request);

			request.signal.throwIfAborted();

			return result;
		},
		openStream: async (path, options = {}) => {
			const request = withSession(options);
			const stream = await http.openStream(path, request);

			request.signal.throwIfAborted();

			return stream;
		},
	};
}
