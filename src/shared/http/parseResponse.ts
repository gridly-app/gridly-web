import type { z } from "zod";
import { ApiError } from "./ApiError";

export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		throw new ApiError(
			"Сервер вернул некорректные данные",
			502,
			"INVALID_RESPONSE",
			parsed.error.issues.map(({ path, message }) => ({ path, message })),
		);
	}
	return parsed.data;
}
