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
	empty: "#fafaf5",
	aisle: "#ebece2",
	storage: "#cdd8b6",
	cold: "#bce0d8",
	unload: "#f3c6a1",
	load: "#d6cbe5",
	charge: "#c0d7a1",
	wall: "#68715e",
};

export const statuses: Record<string, string> = {
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
