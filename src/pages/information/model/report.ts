import { type Order, productPrice, type Warehouse } from "@/entities/warehouse";

export { productPrice } from "@/entities/warehouse";

export interface ReportFilters {
	from: string;
	to: string;
	kind: string;
	status: string;
	category: string;
	compare: boolean;
}
export const defaultCabinet: NonNullable<Warehouse["cabinet"]> = {
	location: "",
	placement: "fefo" as const,
	allowMixedCategories: false,
	reserveOnStart: true,
	lowStockThreshold: 10,
};
const formatters = new Map<string, Intl.DateTimeFormat>();
export function warehouseDay(time: string | number, timezone: string) {
	let formatter = formatters.get(timezone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		formatters.set(timezone, formatter);
	}
	return formatter.format(new Date(time));
}
export function shiftDay(day: string, days: number) {
	return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000)
		.toISOString()
		.slice(0, 10);
}
export function previousPeriod(filters: ReportFilters): ReportFilters {
	const days =
		Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / 86400000) +
		1;
	return {
		...filters,
		from: shiftDay(filters.from, -days),
		to: shiftDay(filters.from, -1),
	};
}
export interface UnpricedDetail {
	id: string;
	productName: string;
	quantity: number;
	source: string;
}
export type UnpricedSection = "inbound" | "outbound" | "stock" | "writeOffs";

export function buildReport(w: Warehouse, filters: ReportFilters) {
	const products = new Map(w.products.map((p) => [p.id, p]));
	const inPeriod = (date: string) => {
		if (!Number.isFinite(Date.parse(date))) return false;
		const day = warehouseDay(date, w.timezone);
		return day >= filters.from && day <= filters.to;
	};
	const orders = w.orders
		.filter(
			(o) =>
				inPeriod(o.created) &&
				(filters.kind === "all" || o.kind === filters.kind) &&
				(filters.status === "all" || o.status === filters.status),
		)
		.map((o) => ({
			...o,
			lines: o.lines.filter(
				(l) =>
					filters.category === "all" ||
					products.get(l.product)?.category === filters.category,
			),
		}))
		.filter((o) => o.lines.length);
	const amount = (list: Order[]) => {
		let value = 0,
			known = 0,
			unknown = 0;
		for (const o of list)
			for (const l of o.lines) {
				const price = productPrice(products.get(l.product)?.price);
				if (price === null) unknown += l.quantity;
				else {
					value += price * l.quantity;
					known += l.quantity;
				}
			}
		return { value, known, unknown };
	};
	const series = new Map<
		string,
		{ day: string; inbound: number; outbound: number }
	>();
	for (const o of orders) {
		const day = warehouseDay(o.created, w.timezone);
		const bucket = series.get(day) ?? { day, inbound: 0, outbound: 0 };
		bucket[o.kind] += o.lines.reduce((n, l) => n + l.quantity, 0);
		series.set(day, bucket);
	}
	const stock = w.stock.filter(
		(s) =>
			filters.category === "all" ||
			products.get(s.product)?.category === filters.category,
	);
	let stockValue = 0,
		unpricedStock = 0;
	for (const s of stock) {
		const price = productPrice(products.get(s.product)?.price);
		if (price === null) unpricedStock += s.quantity;
		else stockValue += price * s.quantity;
	}
	const writeOffs = w.writeOffs?.filter(
		(s) =>
			inPeriod(s.time) &&
			(filters.category === "all" ||
				products.get(s.product)?.category === filters.category),
	);
	const productName = (id: string) => products.get(id)?.name ?? `Товар ${id}`;
	const orderDetails = (kind: Order["kind"]): UnpricedDetail[] =>
		orders
			.filter((order) => order.kind === kind)
			.flatMap((order) =>
				order.lines.flatMap((line, index) =>
					productPrice(products.get(line.product)?.price) === null &&
					line.quantity > 0
						? [
								{
									id: `${order.id}:${index}`,
									productName: productName(line.product),
									quantity: line.quantity,
									source: `Заказ ${order.number}`,
								},
							]
						: [],
				),
			);
	const unpricedDetails: Record<UnpricedSection, UnpricedDetail[]> = {
		inbound: orderDetails("inbound"),
		outbound: orderDetails("outbound"),
		stock: stock
			.filter(
				(item) =>
					productPrice(products.get(item.product)?.price) === null &&
					item.quantity > 0,
			)
			.map((item) => ({
				id: item.id,
				productName: productName(item.product),
				quantity: item.quantity,
				source: `Партия ${item.id} · ячейка ${item.cell}`,
			})),
		writeOffs: (writeOffs ?? [])
			.filter((item) => item.price === null && item.quantity > 0)
			.map((item) => ({
				id: item.id,
				productName: productName(item.product),
				quantity: item.quantity,
				source: `${warehouseDay(item.time, w.timezone)} · ${item.reason}`,
			})),
	};
	return {
		unpricedDetails,
		orders,
		series: [...series.values()].sort((a, b) => a.day.localeCompare(b.day)),
		inbound: amount(orders.filter((o) => o.kind === "inbound")),
		outbound: amount(orders.filter((o) => o.kind === "outbound")),
		completed: orders.filter((o) =>
			["received", "shipped", "received_with_losses", "completed"].includes(
				o.status,
			),
		).length,
		active: orders.filter(
			(o) =>
				![
					"received",
					"shipped",
					"received_with_losses",
					"completed",
					"cancelled",
					"canceled",
				].includes(o.status),
		).length,
		cancelled: orders.filter((o) =>
			["cancelled", "canceled"].includes(o.status),
		).length,
		stockQuantity: stock.reduce((n, s) => n + s.quantity, 0),
		reserved: stock.reduce((n, s) => n + (s.reserved ?? 0), 0),
		stockValue,
		unpricedStock,
		writeOffQuantity: writeOffs?.reduce((n, s) => n + s.quantity, 0),
		writeOffValue: writeOffs?.reduce(
			(n, s) => n + (s.price ?? 0) * s.quantity,
			0,
		),
		unpricedWriteOffs: writeOffs?.reduce(
			(n, s) => n + (s.price === null ? s.quantity : 0),
			0,
		),
	};
}
export function reportCsv(w: Warehouse, filters: ReportFilters) {
	const report = buildReport(w, filters);
	const safe = (value: unknown) => {
		const raw = String(value ?? "");
		return `"${(/^\s*[=+\-@]|^[\t\r\n]/.test(raw) ? "'" : "") + raw.replaceAll('"', '""')}"`;
	};
	const rows: unknown[][] = [
		["Склад", w.name],
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

	const prices = new Map(w.products.map((p) => [p.id, productPrice(p.price)]));
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
		const result = buildReport(w, previous);
		rows.push(
			["Предыдущий период", previous.from, previous.to],
			["Заказов в предыдущем периоде", result.orders.length],
			["Оценка поставок", result.inbound.value],
			["Оценка отгрузок", result.outbound.value],
		);
	}
	return `\uFEFF${rows.map((r) => r.map(safe).join(";")).join("\r\n")}`;
}
