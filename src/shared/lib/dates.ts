import { z } from "zod";

const formatterCacheLimit = 32;
const formatters = new Map<
	string | undefined,
	ReturnType<typeof dateFormatters>
>();

function dateFormatters(timeZone: string | undefined) {
	return {
		moment: new Intl.DateTimeFormat("ru-RU", {
			dateStyle: "short",
			timeStyle: "short",
			timeZone,
		}),
		day: new Intl.DateTimeFormat("sv-SE", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			timeZone,
		}),
	};
}

function getFormatters(timeZone: string | undefined) {
	const cached = formatters.get(timeZone);

	if (cached) return cached;

	let formatter;

	try {
		formatter = dateFormatters(timeZone);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;

		formatter = dateFormatters("UTC");
	}

	if (formatters.size >= formatterCacheLimit) formatters.clear();

	formatters.set(timeZone, formatter);

	return formatter;
}

export function formatMoment(value: string | null, timeZone?: string) {
	if (value === null) return "Не указано";

	const timestamp = Date.parse(value);

	return Number.isFinite(timestamp)
		? getFormatters(timeZone).moment.format(timestamp)
		: value;
}

export function dateKey(value: string, timeZone?: string) {
	const timestamp = Date.parse(value);

	return Number.isFinite(timestamp)
		? getFormatters(timeZone).day.format(timestamp)
		: null;
}

const dateInput = z.iso.date();

export function dateRangeError(from: string, to: string) {
	if (
		(from && !dateInput.safeParse(from).success) ||
		(to && !dateInput.safeParse(to).success)
	) {
		return "Введите даты в допустимом диапазоне.";
	}

	if (from && to && from > to) {
		return "Дата окончания должна быть не раньше даты начала.";
	}

	return null;
}
