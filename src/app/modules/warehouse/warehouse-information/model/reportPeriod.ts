import { dateKey } from "@/shared/lib";

export interface ReportFilters {
	from: string;
	to: string;
	kind: string;
	status: string;
	category: string;
	compare: boolean;
}

export type ReportRange = Pick<ReportFilters, "from" | "to">;

export const dayMs = 86_400_000;

function utcDay(day: string) {
	return Date.parse(`${day}T00:00:00Z`);
}

export function warehouseDay(time: string | number, timezone: string) {
	return dateKey(time, timezone) ?? "";
}

export function shiftDay(day: string, days: number) {
	return new Date(utcDay(day) + days * dayMs).toISOString().slice(0, 10);
}

export function periodDays({ from, to }: ReportRange) {
	return Math.round((Date.parse(to) - Date.parse(from)) / dayMs) + 1;
}

export function previousPeriod(filters: ReportFilters): ReportFilters {
	const days = periodDays(filters);

	return {
		...filters,
		from: shiftDay(filters.from, -days),
		to: shiftDay(filters.from, -1),
	};
}

export function formatShortDay(day: string) {
	return new Date(utcDay(day)).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	});
}

export function formatRange({ from, to }: ReportRange) {
	return from === to
		? formatShortDay(from)
		: `${formatShortDay(from)} — ${formatShortDay(to)}`;
}
