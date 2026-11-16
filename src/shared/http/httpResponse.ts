import { ApiError } from "./ApiError";

export async function readHttpBody(
	response: Response,
	assertActive: () => void,
): Promise<unknown> {
	if (response.status === 204) return undefined;
	return response.json().catch(() => {
		assertActive();
		if (response.ok) {
			throw new ApiError(
				"Сервер вернул некорректный JSON",
				response.status,
				"INVALID_RESPONSE",
			);
		}
		return null;
	});
}

export function parseHttpError(status: number, data: unknown): ApiError {
	const envelope = isRecord(data) ? data : {};
	const error = isRecord(envelope.error) ? envelope.error : envelope;
	return new ApiError(
		textField(error.message) ||
			textField(envelope.message) ||
			"Не удалось выполнить запрос",
		status,
		textField(error.code) || textField(envelope.code),
		error.details ?? envelope.details,
		textField(envelope.request_id) || textField(error.request_id),
	);
}

export function readSessionToken(status: number, data: unknown): string {
	if (
		isRecord(data) &&
		typeof data.access_token === "string" &&
		data.access_token
	) {
		return data.access_token;
	}
	throw new ApiError(
		"Сервер не вернул токен сессии",
		status,
		"INVALID_RESPONSE",
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textField(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}
