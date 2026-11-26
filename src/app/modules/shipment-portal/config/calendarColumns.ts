export const calendarColumns = [
	["date", "Дата"],
	["number", "Заказ"],
	["item", "Номенклатура"],
	["priority", "Приоритет"],
	["unit", "Единица"],
	["plan", "План"],
	["actual", "Факт"],
	["remaining", "Остаток"],
	["transport", "Перевозка"],
	["status", "Статус"],
] as const;

export type CalendarField = (typeof calendarColumns)[number][0];

export type CalendarColumn = readonly [CalendarField, string];

export const fixedCalendarColumns: CalendarField[] = ["date", "actual"];
