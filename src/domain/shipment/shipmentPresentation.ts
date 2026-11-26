export const priorities = {
	low: "Низкий",
	normal: "Обычный",
	high: "Высокий",
} as const;
export const categories = {
	specification: "Заявка / спецификация",
	drawing: "Чертёж",
	quality_certificate: "Паспорт качества",
	transport: "Транспортный документ",
	closing: "Закрывающий документ",
} as const;
export const stages = {
	accepted: "Заказ принят",
	warehouse_preparation: "Подготовка на складе",
	ready_to_ship: "Готов к отгрузке",
	loading: "Погрузка",
	handed_to_carrier: "Передан перевозчику",
	in_transit: "В пути",
	delivered: "Доставлен или получен",
} as const;
export const transports = {
	rail: "Железнодорожный",
	road: "Автомобильный",
} as const;

export function formatUnit(unit: string) {
	return (
		({ pcs: "шт.", pack: "упак.", pallet: "пал." } as Record<string, string>)[
			unit
		] ?? unit
	);
}
