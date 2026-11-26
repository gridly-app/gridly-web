import { shipment } from "../../../../../../tests/support/shipment";

import {
	type CalendarFilters,
	initialCalendarFilters,
} from "./calendarFilters";
import type { CalendarSort } from "./calendarSort";
import type { ShipmentCalendarOptions } from "./shipmentCalendarOptions";

export const filters: CalendarFilters = initialCalendarFilters;

export const byDate: CalendarSort = { field: "date", ascending: true };

export function calendarOptions(): ShipmentCalendarOptions {
	const sample = shipment();

	return {
		shipment: sample,
		items: sample.items,
		priority: "high",
		showPriority: true,
	};
}
