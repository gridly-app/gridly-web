export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string | undefined,
		readonly details?: unknown | undefined,
		readonly requestId?: string | undefined,
	) {
		super(message);
		this.name = "ApiError";
	}
}
