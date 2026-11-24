import { formatUnit, priorities, type Shipment } from "@/domain/shipment";
import {
	shipmentCalendar,
	transportSummary,
	type CalendarFilters,
} from "./shipmentCalendar";
import { orderStates } from "./shipmentLabels";

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

const collator = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
});

export type CalendarField = (typeof calendarColumns)[number][0];
export type CalendarColumn = readonly [CalendarField, string];
export type CalendarSort = { field: CalendarField; ascending: boolean };
export type CalendarItem = Pick<
	Shipment["items"][number],
	"order_line_id" | "name" | "sku"
> &
	Partial<Pick<Shipment["items"][number], "grade">>;
export type ShipmentCalendarOptions = {
	shipment: Pick<Shipment, "order" | "plan" | "actual">;
	items: CalendarItem[];
	priority: Shipment["warehouse"]["priority"];
	showPriority: boolean;
};

export function calendarRows(
	{
		shipment,
		items: availableItems,
		priority,
	}: Pick<ShipmentCalendarOptions, "shipment" | "items" | "priority">,
	filters: CalendarFilters,
	sort: CalendarSort,
) {
	const items = new Map(
		availableItems.map((item) => [item.order_line_id, item]),
	);

	const calendar = shipmentCalendar(shipment, filters);
	const rows = calendar.map((row) => {
		const itemNames = Array.from(row.items, (id) => items.get(id)?.name ?? id);

		return {
			...row,
			cells: {
				date: row.date,
				number: shipment.order.number,
				item: itemNames.join(", "),
				priority: priority ? priorities[priority] : "Не указан",
				unit: formatUnit(row.unit),
				plan: row.plan,
				actual: row.actual,
				remaining:
					row.plan === null ? null : Math.max(0, row.plan - row.actual),
				transport: transportSummary(row.facts),
				status: orderStates[shipment.order.state],
			},
		};
	});

	rows.sort((left, right) => {
		const leftValue = left.cells[sort.field];
		const rightValue = right.cells[sort.field];
		const difference =
			typeof leftValue === "number" && typeof rightValue === "number"
				? leftValue - rightValue
				: collator.compare(String(leftValue ?? ""), String(rightValue ?? ""));

		return sort.ascending ? difference : -difference;
	});

	return rows;
}

export type CalendarRow = ReturnType<typeof calendarRows>[number];

export function calendarTotals(rows: CalendarRow[]) {
	const totals = new Map<string, { plan: number | null; actual: number }>();

	for (const row of rows) {
		const total = totals.get(row.unit) ?? { plan: null, actual: 0 };

		if (row.plan !== null) total.plan = (total.plan ?? 0) + row.plan;

		total.actual += row.actual;
		totals.set(row.unit, total);
	}

	return [...totals].map(([unit, total]) => ({ unit, ...total }));
}

export type CalendarSelection =
	{ kind: "row"; key: string } | { kind: "total"; unit: string } | null;

export function calendarDetail(
	rows: CalendarRow[],
	selection: CalendarSelection,
) {
	if (!selection) return null;

	if (selection.kind === "row") {
		const row = rows.find((row) => row.key === selection.key);

		if (!row || row.facts.length === 0) return null;

		return { title: `Факт отгрузки · ${row.date}`, facts: row.facts };
	}

	const selectedRows = rows.filter((row) => row.unit === selection.unit);
	const facts = selectedRows.flatMap((row) => row.facts);

	if (facts.length === 0) return null;

	return { title: "Факт за выбранный период", facts };
}
