export interface LandingScenario {
	label: string;
	title: string;
	description: string;
	location: string;
	steps: readonly string[];
	raisedCells?: readonly number[];
	route?: {
		cells: readonly number[];
		shelfCell: number;
		shelfEndpoint: "start" | "end";
	};
}

const storageCells = [9, 10, 11, 12, 17, 18, 19, 20];

export const landingScenarios = {
	inbound: {
		label: "Приёмка",
		title: "От поставки до своей ячейки.",
		description:
			"Создайте поставку, подтвердите разгрузку и проследите, как товар попадает в зону хранения.",
		location: "Зона приёмки → Хранение",
		steps: ["Поставка создана", "Разгрузка подтверждена", "Товар размещён"],
		route: { cells: [24, 25, 26, 27], shelfCell: 19, shelfEndpoint: "end" },
	},
	storage: {
		label: "Хранение",
		title: "У каждой вещи есть место.",
		description:
			"Смотрите остатки по ячейкам, выделяйте зоны на карте и держите структуру склада в порядке.",
		location: "Хранение → Остатки",
		steps: ["Зона выбрана", "Остатки проверены", "Размещение обновлено"],
		raisedCells: storageCells,
	},
	outbound: {
		label: "Отгрузка",
		title: "От заказа до отправки.",
		description:
			"Соберите заказ, запустите отбор и подтвердите погрузку. Все этапы остаются в истории.",
		location: "Хранение → Зона отгрузки",
		steps: ["Заказ собран", "Отбор выполнен", "Погрузка подтверждена"],
		route: { cells: [28, 29, 30, 31], shelfCell: 20, shelfEndpoint: "start" },
	},
} satisfies Record<string, LandingScenario>;

export type LandingScenarioId = keyof typeof landingScenarios;

const scenarioIds: readonly LandingScenarioId[] = [
	"inbound",
	"storage",
	"outbound",
];

export const scenarioOptions = scenarioIds.map((value) => ({
	value,
	label: landingScenarios[value].label,
}));
