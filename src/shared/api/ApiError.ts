export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
		readonly details?: unknown,
		readonly requestId?: string,
	) {
		super(
			code === "STALE_REVISION"
				? "Объект изменился. Обновите данные и сохраните правки вручную."
				: message,
		);
		this.name = "ApiError";
	}
}
