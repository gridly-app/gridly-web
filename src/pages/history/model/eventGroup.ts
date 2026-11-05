import type { Event } from "@/entities/warehouse";

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
function fromText(text: string) {
	if (/заказ|поставк|отгрузк|order/i.test(text)) return "order";
	if (/робот|robot/i.test(text)) return "robot";
	if (/списан|остат|партия|inventory|stock/i.test(text)) return "stock";
	if (/маршрут|карт[аыуе]|layout/i.test(text)) return "map";
	if (/каталог|категори|товар|product/i.test(text)) return "product";
	if (/задач|task/i.test(text)) return "task";
	if (/обработк|симуляц|simulation/i.test(text)) return "simulation";
	if (/склад|warehouse/i.test(text)) return "warehouse";
	return null;
}
export function historyEventGroup(
	event: Pick<Event, "type" | "entity" | "title" | "detail">,
) {
	for (const source of [event.type, event.entity]) {
		for (const token of (source || "").toLowerCase().split(/[/._:-]+/)) {
			const key = token.replace(/s$/, "");
			if (historyGroupLabels[key]) return key;
		}
	}
	return fromText(event.title) ?? fromText(event.detail || "") ?? "warehouse";
}
