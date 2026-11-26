import { productPrice } from "@/domain/warehouse";
import { encodeCsv } from "@/shared/lib";
import { buildReport, previousPeriod, type ReportFilters } from "./report";
import type { ReportWarehouse } from "./warehouseResources";

export function reportCsv(warehouse: ReportWarehouse, filters: ReportFilters) {
	const report = buildReport(warehouse, filters);
	const rows: (string | number | null)[][] = [
		["Склад", warehouse.name],
		["Период", filters.from, filters.to],
		["Тип", filters.kind],
		["Статус", filters.status],
		["Категория", filters.category],
		["Оценка по текущим ценам каталога"],
		[
			"Номер",
			"Тип",
			"Статус",
			"Создан",
			"Количество",
			"Стоимость известных цен",
			"Без цены, шт.",
		],
	];

	const prices = new Map(
		warehouse.products.map((p) => [p.id, productPrice(p.price)]),
	);
	for (const o of report.orders) {
		const money = o.lines.reduce(
			(sum, line) => {
				const price = prices.get(line.product);
				if (price == null) sum.unknown += line.quantity;
				else sum.value += price * line.quantity;
				return sum;
			},
			{ value: 0, unknown: 0 },
		);
		rows.push([
			o.number,
			o.kind,
			o.status,
			o.created,
			o.lines.reduce((n, l) => n + l.quantity, 0),
			money.value,
			money.unknown,
		]);
	}
	rows.push(
		["Текущие остатки, шт.", report.stockQuantity],
		["Стоимость текущих остатков", report.stockValue],
		["Остатки без цены, шт.", report.unpricedStock],
		["Списано, шт.", report.writeOffQuantity ?? "Нет данных"],
		["Стоимость списаний", report.writeOffValue ?? "Нет данных"],
	);
	if (filters.compare) {
		const previous = previousPeriod(filters);
		const result = buildReport(warehouse, previous);
		rows.push(
			["Предыдущий период", previous.from, previous.to],
			["Заказов в предыдущем периоде", result.orders.length],
			["Оценка поставок", result.inbound.value],
			["Оценка отгрузок", result.outbound.value],
		);
	}
	return encodeCsv(rows, { separator: ";", includeBom: true });
}
