import { dateKey } from "@/shared/lib";

export interface ReportFilters {
	from: string;
	to: string;
	kind: string;
	status: string;
	category: string;
	compare: boolean;
}

export function warehouseDay(time: string | number, timezone: string) {
	return dateKey(time, timezone) ?? "";
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
