import { formatUnit, transports, type Shipment } from "@/domain/shipment";
import { encodeCsv, formatMoment } from "@/shared/lib";

type ShipmentFacts = Pick<Shipment, "order" | "items" | "actual">;

function shipmentFactRows({ items, actual }: ShipmentFacts) {
	const itemsById = new Map(items.map((item) => [item.order_line_id, item]));

	return actual.map((fact) => {
		const item = itemsById.get(fact.order_line_id);

		return {
			fact,
			sku: item?.sku ?? null,
			name: item?.name ?? fact.order_line_id,
			unit: formatUnit(fact.unit),
		};
	});
}

export function shipmentFactSummary(shipment: ShipmentFacts) {
	const { number, recipient, time_zone: timeZone } = shipment.order;
	const rows = shipmentFactRows(shipment).map(({ fact, name, unit }) => {
		const shippedAt = formatMoment(fact.shipped_at, timeZone);

		return `${name} — ${fact.quantity} ${unit} · ${shippedAt}`;
	});

	return [`Заказ ${number} · ${recipient}`, "Факт отгрузки", ...rows].join(
		"\n",
	);
}

export function shipmentFactCsv(shipment: ShipmentFacts) {
	const {
		number,
		recipient,
		warehouse_name: warehouse,
		time_zone: timeZone,
	} = shipment.order;
	const headers = [
		"Заказ",
		"Получатель",
		"Склад",
		"Артикул",
		"Позиция",
		"Количество",
		"Единица измерения",
		"Упаковка",
		"Отгружено",
		"Погружено",
		"Часовой пояс",
		"Перевозка",
		"Вагон / автомобиль",
		"Рейс / накладная",
	];
	const rows = shipmentFactRows(shipment).map(({ fact, sku, name, unit }) => [
		number,
		recipient,
		warehouse,
		sku,
		name,
		fact.quantity,
		unit,
		fact.packaging,
		formatMoment(fact.shipped_at, timeZone),
		fact.loaded_at && formatMoment(fact.loaded_at, timeZone),
		timeZone,
		transports[fact.transport_type],
		fact.vehicle_number,
		fact.reference_number,
	]);

	return encodeCsv([headers, ...rows], { separator: ";", includeBom: true });
}
