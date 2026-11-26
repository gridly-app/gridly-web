import { formatUnit, priorities } from "@/domain/shipment";

import type { CalendarFilters } from "./calendarFilters";
import { type CalendarSort, sortCalendarRows } from "./calendarSort";
import { type CalendarBucket, shipmentCalendar } from "./shipmentCalendar";
import type { ShipmentCalendarOptions } from "./shipmentCalendarOptions";
import { orderStates } from "../../config/shipmentLabels";
import { transportSummary } from "./transportSummary";

export type CalendarCells = {
	date: string;
	number: string;
	item: string;
	priority: string;
	unit: string;
	plan: number | null;
	actual: number;
	remaining: number | null;
	transport: string;
	status: string;
};

export type CalendarRow = CalendarBucket & { cells: CalendarCells };

type CalendarSource = Pick<
	ShipmentCalendarOptions,
	"shipment" | "items" | "priority"
>;

function itemLabel(
	itemIds: ReadonlySet<string>,
	names: ReadonlyMap<string, string>,
) {
	return Array.from(itemIds, (id) => names.get(id) ?? id).join(", ");
}

function remainingQuantity({ plan, actual }: CalendarBucket) {
	return plan === null ? null : Math.max(0, plan - actual);
}

export function calendarRows(
	{ shipment, items, priority }: CalendarSource,
	filters: CalendarFilters,
	sort: CalendarSort,
) {
	const itemNames = new Map(
		items.map((item) => [item.order_line_id, item.name]),
	);
	const shipmentCells = {
		number: shipment.order.number,
		priority: priority ? priorities[priority] : "Не указан",
		status: orderStates[shipment.order.state],
	};
	const rows = shipmentCalendar(shipment, filters).map(
		(bucket): CalendarRow => ({
			...bucket,
			cells: {
				...shipmentCells,
				date: bucket.date,
				item: itemLabel(bucket.items, itemNames),
				unit: formatUnit(bucket.unit),
				plan: bucket.plan,
				actual: bucket.actual,
				remaining: remainingQuantity(bucket),
				transport: transportSummary(bucket.facts),
			},
		}),
	);

	return sortCalendarRows(rows, sort);
}
