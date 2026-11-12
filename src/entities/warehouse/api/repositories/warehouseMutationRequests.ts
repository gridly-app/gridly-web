import { ApiError, type HttpClient, type RequestOptions } from "@/shared/api";

export class WarehouseMutationRequests {
	private readonly pendingKeys = new Map<string, string>();

	constructor(
		private readonly http: HttpClient,
		private readonly sessionSignal: () => AbortSignal,
	) {}

	clear() {
		this.pendingKeys.clear();
	}

	async send(
		path: string,
		options: RequestOptions,
		keyed = true,
	): Promise<unknown> {
		const session = this.sessionSignal();
		const signature =
			options.idempotencyKey ??
			JSON.stringify([path, options.method, options.body]);
		let key = this.pendingKeys.get(signature) ?? options.idempotencyKey;

		if (keyed && !key) {
			key = crypto.randomUUID();
			this.pendingKeys.set(signature, key);
		}
		try {
			const result = await this.http.request(path, {
				...options,
				idempotencyKey: keyed ? key : undefined,
			});

			options.signal?.throwIfAborted();
			session.throwIfAborted();
			this.pendingKeys.delete(signature);

			return result;
		} catch (error) {
			if (
				!session.aborted &&
				error instanceof ApiError &&
				error.status < 500 &&
				error.status !== 429
			) {
				this.pendingKeys.delete(signature);
			}
			throw error;
		}
	}
}
