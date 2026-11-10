export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string | undefined,
		readonly details?: unknown | undefined,
		readonly requestId?: string | undefined,
	) {
		super(
			code === "STALE_REVISION"
				? "Объект изменился. Обновите данные и сохраните правки вручную."
				: code === "CATEGORY_HAS_PRODUCTS"
					? "Нельзя архивировать категорию: сначала перенесите или архивируйте связанные товары."
					: message,
		);
		this.name = "ApiError";
	}
}
