export type CalendarFilters = {
	from: string;
	to: string;
	item: string | null;
	transport: string;
	weekly: boolean;
};

export const initialCalendarFilters: CalendarFilters = {
	from: "",
	to: "",
	item: null,
	transport: "",
	weekly: false,
};

export function hasInvalidDateRange({ from, to }: CalendarFilters) {
	return !!from && !!to && from > to;
}
