import type { Actual, Shipment } from "@/domain/shipment";

import { calendarDay, weekStart } from "../../lib/calendarDates";
import type { CalendarFilters } from "./calendarFilters";

export type CalendarBucket = {
	key: string;
	date: string;
	unit: string;
	plan: number | null;
	actual: number;
	facts: Actual[];
	items: Set<string>;
};

export function shipmentCalendar(
	shipment: Pick<Shipment, "order" | "plan" | "actual">,
	filters: CalendarFilters,
) {
	const buckets = new Map<string, CalendarBucket>();

	function bucketFor(date: string, unit: string, item: string) {
		const isBeforeStart = filters.from !== "" && date < filters.from;
		const isAfterEnd = filters.to !== "" && date > filters.to;
		const isDifferentItem = filters.item !== null && filters.item !== item;

		if (isBeforeStart || isAfterEnd || isDifferentItem) return;

		const bucketDate = filters.weekly ? weekStart(date) : date;
		const key = JSON.stringify([bucketDate, unit]);
		const bucket = buckets.get(key) ?? {
			key,
			date: bucketDate,
			unit,
			plan: null,
			actual: 0,
			facts: [],
			items: new Set<string>(),
		};

		bucket.items.add(item);
		buckets.set(key, bucket);

		return bucket;
	}

	for (const entry of shipment.plan) {
		const bucket = bucketFor(entry.date, entry.unit, entry.order_line_id);

		if (bucket) bucket.plan = (bucket.plan ?? 0) + entry.quantity;
	}

	for (const entry of shipment.actual) {
		const isOtherTransport =
			filters.transport !== "" && filters.transport !== entry.transport_type;

		if (isOtherTransport) continue;

		const bucket = bucketFor(
			calendarDay(entry.shipped_at, shipment.order.time_zone),
			entry.unit,
			entry.order_line_id,
		);

		if (!bucket) continue;

		bucket.actual += entry.quantity;
		bucket.facts.push(entry);
	}

	return [...buckets.values()];
}

export type { CalendarFilters } from "./calendarFilters";
export { shipmentCsv } from "./shipmentCsv";
export { transportSummary } from "./transportSummary";
