import { ZodError } from "zod";
import { ApiError } from "@/shared/api";
import { UserError } from "./UserError";

const retryMessage = "Не удалось выполнить действие. Попробуйте ещё раз.";
const validationMessage = "Проверьте введённые данные и попробуйте ещё раз.";
const timeoutMessage = "Сервер отвечает слишком долго. Попробуйте ещё раз.";

const apiMessages = new Map([
	[
		"CATEGORY_HAS_PRODUCTS",
		"Нельзя архивировать категорию. Сначала перенесите или архивируйте связанные товары.",
	],
	["INVALID_CREDENTIALS", "Проверьте логин и пароль и попробуйте ещё раз."],
	[
		"INVALID_RESPONSE",
		"Не удалось прочитать ответ сервера. Попробуйте ещё раз.",
	],
	[
		"STALE_REVISION",
		"Объект изменился. Обновите данные, проверьте изменения и повторите сохранение.",
	],
	["STATIC_MOCK", "В тестовом режиме сохранять изменения нельзя."],
	["SESSION_CHANGED", "Аккаунт в браузере изменился. Войдите снова."],
]);

const statusMessages = new Map([
	[400, validationMessage],
	[401, "Сеанс завершён. Войдите снова."],
	[403, "У вас нет прав для этого действия."],
	[404, "Данные не найдены. Обновите страницу и попробуйте ещё раз."],
	[408, timeoutMessage],
	[409, "Данные изменились. Обновите страницу и попробуйте ещё раз."],
	[422, validationMessage],
	[429, "Слишком много запросов. Подождите немного и попробуйте снова."],
	[504, timeoutMessage],
]);

export function errorMessage(error: unknown): string {
	if (error instanceof UserError) return error.message;
	if (error instanceof ApiError) {
		const message = error.code ? apiMessages.get(error.code) : undefined;
		return (
			message ??
			statusMessages.get(error.status) ??
			(error.status >= 500
				? "Сервис временно недоступен. Попробуйте ещё раз."
				: retryMessage)
		);
	}
	if (error instanceof ZodError) return validationMessage;
	if (error instanceof DOMException && error.name === "TimeoutError")
		return timeoutMessage;
	if (typeof navigator !== "undefined" && navigator.onLine === false)
		return "Нет соединения. Подключитесь к сети и попробуйте ещё раз.";
	return retryMessage;
}
