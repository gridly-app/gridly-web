import type { CellType } from "./warehouse";
import type { WorkflowKey } from "./workflowPolicy";

export const cellLabels: Record<CellType, string> = {
	empty: "Пустая клетка",
	aisle: "Проход",
	storage: "Хранение",
	cold: "Хранение",
	unload: "Разгрузка",
	load: "Погрузка",
	charge: "Зарядка",
	wall: "Стена",
};

export const statuses: Record<string, string> = {
	active: "В работе",
	completed: "Завершён",
	created: "Создан",
	charging: "Заряжается",
	draft: "Черновик",
	in_progress: "В работе",
	awaiting_load: "Ожидает погрузки",
	received_with_losses: "Принята с потерями",
	aborting: "Возврат груза",
	moving: "Движется",
	returning: "На стоянку",
	working: "Выполняет действие",
	carrying: "Перевозит груз",
	waiting_confirmation: "Ждёт подтверждения",
	unavailable: "Нет связи",
	expired: "Просрочено",
	running: "В работе",
	waiting: "Ждёт подтверждения",
	blocked: "Заблокирован",
	received: "Принята",
	shipped: "Отправлен",
	cancelled: "Отменён",
	idle: "Свободен",
};

export const confirmationLabels: Record<WorkflowKey, string> = {
	confirmUnload: "Разгрузка",
	confirmPick: "Отбор",
	confirmPutaway: "Размещение",
	confirmLoad: "Погрузка",
};

export const robotRoleLabels: Record<string, string> = {
	unload: "Разгрузка",
	sort: "Сортировка",
	ship: "Отгрузка",
};

export const robotRoleOptions = Object.entries(robotRoleLabels).map(
	([value, label]) => ({
		value,
		label,
	}),
);
