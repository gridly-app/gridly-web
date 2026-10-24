import type { CommandPayloads } from "@/entities/warehouse";

export const commandTitles: Record<keyof CommandPayloads, string> = {
	routes: "Маршруты сохранены",
	resize: "Размер карты изменён",
	simulation: "Режим симуляции изменён",
	draft: "Черновик сохранён",
	discard: "Изменения отменены",
	publish: "Карта опубликована",
	robot: "Робот сохранён",
	deleteRobot: "Робот удалён",
	zone: "Складская зона сохранена",
	product: "Товар сохранён",
	category: "Категория сохранена",
	order: "Заказ создан",
	start: "Заказ запущен",
	confirm: "Этап подтверждён",
	cancel: "Заказ отменён",
	orderAction: "Заказ изменён",
	taskAction: "Задача подтверждена",
	writeoff: "Товар списан",
	settings: "Настройки сохранены",
};
