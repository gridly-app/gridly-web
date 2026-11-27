import { productPrice } from "@/domain/warehouse";
import { encodeCsv } from "@/shared/lib";

import { buildReport } from "./report";
import { previousPeriod, type ReportFilters } from "./reportPeriod";
import type { ReportWarehouse } from "./warehouseResources";

type CsvRow = (string | number | null)[];

const orderHeader = [
	"Номер",
	"Тип",
	"Статус",
	"Создан",
	"Количество",
	"Стоимость известных цен",
	"Без цены, шт.",
];

export function reportCsv(warehouse: ReportWarehouse, filters: ReportFilters) {
	const report = buildReport(warehouse, filters);
	const prices = new Map(
		warehouse.products.map((product) => [
			product.id,
			productPrice(product.price),
		]),
	);
	const rows: CsvRow[] = [
		["Склад", warehouse.name],
		["Период", filters.from, filters.to],
		["Тип", filters.kind],
		["Статус", filters.status],
		["Категория", filters.category],
		["Оценка по текущим ценам каталога"],
		orderHeader,
	];

	for (const order of report.orders) {
		let value = 0;
		let unpriced = 0;
		let quantity = 0;

		for (const line of order.lines) {
			const price = prices.get(line.product);

			quantity += line.quantity;

			if (price == null) {
				unpriced += line.quantity;

				continue;
			}

			value += price * line.quantity;
		}

		rows.push([
			order.number,
			order.kind,
			order.status,
			order.created,
			quantity,
			value,
			unpriced,
		]);
	}

	rows.push(
		["Текущие остатки, шт.", report.stockQuantity],
		["Стоимость текущих остатков", report.stockValue],
		["Остатки без цены, шт.", report.unpricedStock],
		["Списано, шт.", report.writeOffQuantity ?? "Нет данных"],
		["Стоимость списаний", report.writeOffValue ?? "Нет данных"],
	);

	if (filters.compare) rows.push(...previousPeriodRows(warehouse, filters));

	return encodeCsv(rows, { separator: ";", includeBom: true });
}

function previousPeriodRows(
	warehouse: ReportWarehouse,
	filters: ReportFilters,
): CsvRow[] {
	const previous = previousPeriod(filters);
	const report = buildReport(warehouse, previous);

	return [
		["Предыдущий период", previous.from, previous.to],
		["Заказов в предыдущем периоде", report.orders.length],
		["Оценка поставок", report.inbound.value],
		["Оценка отгрузок", report.outbound.value],
	];
}
