import type { CellType } from "../model/warehouse/schemas";

export const cellLabels: Record<CellType, string> = {
	empty: "Пустая клетка",
	aisle: "Проход",
	storage: "Хранение",
	cold: "Холодное хранение",
	unload: "Разгрузка",
	load: "Погрузка",
	charge: "Зарядка",
	wall: "Стена",
};

export const cellColors: Record<CellType, string> = {
	empty: "#f8fbf9",
	aisle: "#e6efea",
	storage: "#acd6bc",
	cold: "#b9e0e6",
	unload: "#f3c6a1",
	load: "#d6cbe5",
	charge: "#b9decc",
	wall: "#567564",
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

export const confirmationLabels = [
	"Разгрузка",
	"Отбор",
	"Размещение",
	"Погрузка",
] as const;

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
