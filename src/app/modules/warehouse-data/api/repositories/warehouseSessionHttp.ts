import type { HttpClient, RequestOptions } from "@/shared/http";

export function warehouseSessionHttp(
	http: HttpClient,
	getSessionSignal: () => AbortSignal,
): HttpClient {
	function withSession(options: RequestOptions) {
		const session = getSessionSignal();
		const signal = options.signal
			? AbortSignal.any([options.signal, session])
			: session;

		return { ...options, signal };
	}

	const openStream = http.openStream?.bind(http);

	return {
		request: async (path, options = {}) => {
			const request = withSession(options);
			const result = await http.request(path, request);

			request.signal.throwIfAborted();

			return result;
		},
		...(openStream && {
			openStream: async (path: string, options: RequestOptions = {}) => {
				const request = withSession(options);
				const stream = await openStream(path, request);

				request.signal.throwIfAborted();

				return stream;
			},
		}),
	};
}
