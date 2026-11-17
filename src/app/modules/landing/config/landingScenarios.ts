export type LandingScenarioId = "inbound" | "storage" | "outbound";

export interface LandingScenario {
	id: LandingScenarioId;
	label: string;
	title: string;
	description: string;
	location: string;
	steps: readonly string[];
	activeCells: readonly number[];
	routeCells?: readonly number[];
	routeShelfCell?: number;
}

export const landingScenarios: readonly LandingScenario[] = [
	{
		id: "inbound",
		label: "Приёмка",
		title: "От поставки до своей ячейки.",
		description:
			"Создайте поставку, подтвердите разгрузку и проследите, как товар попадает в зону хранения.",
		location: "Зона приёмки → Хранение",
		steps: ["Поставка создана", "Разгрузка подтверждена", "Товар размещён"],
		activeCells: [9, 10, 11, 12, 17, 18, 19, 20],
		routeCells: [24, 25, 26, 27],
		routeShelfCell: 19,
	},
	{
		id: "storage",
		label: "Хранение",
		title: "У каждой вещи есть место.",
		description:
			"Смотрите остатки по ячейкам, выделяйте зоны на карте и держите структуру склада в порядке.",
		location: "Хранение → Остатки",
		steps: ["Зона выбрана", "Остатки проверены", "Размещение обновлено"],
		activeCells: [9, 10, 11, 12, 17, 18, 19, 20],
	},
	{
		id: "outbound",
		label: "Отгрузка",
		title: "От заказа до отправки.",
		description:
			"Соберите заказ, запустите отбор и подтвердите погрузку. Все этапы остаются в истории.",
		location: "Хранение → Зона отгрузки",
		steps: ["Заказ собран", "Отбор выполнен", "Погрузка подтверждена"],
		activeCells: [9, 10, 11, 12, 17, 18, 19, 20],
		routeCells: [28, 29, 30, 31],
		routeShelfCell: 20,
	},
];
