import { ApiError } from "@/shared/http";
import { errorMessage } from "@/shared/lib";

const messages = new Map(
	Object.entries({
		USER_NOT_FOUND: "Аккаунт с таким логином не найден.",
		ALREADY_MEMBER: "У пользователя уже есть доступ к этому складу.",
		INVALID_PERMISSION_SET:
			"Проверьте набор разрешений. Для дополнительных прав требуется просмотр склада.",
		SELF_DELETE:
			"Нельзя отозвать собственный доступ или деактивировать свой аккаунт.",
		LAST_WAREHOUSE_ADMIN: "Сначала назначьте другого администратора склада.",
		WAREHOUSE_OWNER_TRANSFER_REQUIRED:
			"Сначала передайте владение складом другому пользователю.",
		LOGIN_TAKEN: "Этот логин уже занят.",
		FORBIDDEN: "У вас больше нет права на это действие.",
	}),
);

export function userActionError(error: unknown) {
	if (!(error instanceof ApiError) || !error.code) return errorMessage(error);

	return messages.get(error.code) ?? errorMessage(error);
}
