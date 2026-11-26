import { ApiError } from "@/shared/http";

export const changedSessionMessage =
	"Аккаунт в браузере изменился. Войдите снова.";

export const expiredSessionMessage = "Сеанс завершён. Войдите снова.";

export const unconfirmedLogoutNotice =
	"Локальный выход выполнен. Сервер не подтвердил завершение сессии. Проверьте подключение и повторите выход после входа.";

export const unconfirmedLogoutMessage =
	"Локальный выход выполнен. Серверное завершение не подтверждено.";

export function sessionChangedError() {
	return new ApiError(changedSessionMessage, 401, "SESSION_CHANGED");
}
