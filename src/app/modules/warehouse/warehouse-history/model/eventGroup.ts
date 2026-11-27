import type { Event } from "@/domain/warehouse";

export const historyGroupLabels: Record<string, string> = {
	task: "Задачи роботов",
	order: "Заказы",
	robot: "Роботы",
	stock: "Остатки",
	inventory: "Остатки",
	layout: "Карта",
	map: "Карта",
	product: "Каталог",
	category: "Каталог",
	warehouse: "Склад",
	simulation: "Обработка",
};

const textGroups = [
	{ group: "order", pattern: /заказ|поставк|отгрузк|order/i },
	{ group: "robot", pattern: /робот|robot/i },
	{ group: "stock", pattern: /списан|остат|партия|inventory|stock/i },
	{ group: "map", pattern: /маршрут|карт[аыуе]|layout/i },
	{ group: "product", pattern: /каталог|категори|товар|product/i },
	{ group: "task", pattern: /задач|task/i },
	{ group: "simulation", pattern: /обработк|симуляц|simulation/i },
	{ group: "warehouse", pattern: /склад|warehouse/i },
];

function groupFromText(text: string) {
	return textGroups.find(({ pattern }) => pattern.test(text))?.group;
}

function groupFromTokens(source: string | undefined) {
	const tokens = (source ?? "").toLowerCase().split(/[/._:-]+/);

	return tokens
		.map((token) => token.replace(/s$/, ""))
		.find((key) => historyGroupLabels[key]);
}

export function historyGroupLabel(group: string) {
	return historyGroupLabels[group] ?? "Склад";
}

export function historyEventGroup(
	event: Pick<Event, "type" | "entity" | "title" | "detail">,
) {
	return (
		groupFromTokens(event.type) ??
		groupFromTokens(event.entity) ??
		groupFromText(event.title) ??
		groupFromText(event.detail ?? "") ??
		"warehouse"
	);
}
