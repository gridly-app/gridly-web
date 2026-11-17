export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string | undefined,
		readonly details?: unknown | undefined,
		readonly requestId?: string | undefined,
		readonly retryAfterMs?: number | undefined,
	) {
		super(message);
		this.name = "ApiError";
	}
}
