import type { LayoutOperation } from "@/ports/warehouse";

export function layoutStatus(operation: LayoutOperation | null) {
	switch (operation?.status) {
		case "sending":
			return "Сохраняем планировку…";
		case "unknown":
			return "Исход записи планировки неизвестен. Отправленный снимок сохранён для этой сессии.";
		case "conflict":
			return "Сервер отклонил исходную версию. Сверьте черновик с текущей планировкой.";
		case "rejected":
			return "Сервер не подтвердил запись. Отправленные правки сохранены.";
		case "refreshing":
			return "Запись выполнена. Загружаем актуальную планировку…";
		case "refresh-failed":
			return "Запись выполнена. Не удалось загрузить актуальную планировку.";
	}
}
