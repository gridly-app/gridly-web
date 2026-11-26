export function calendarDay(moment: string, timeZone: string) {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date(moment));
}

export function weekStart(date: string) {
	const day = new Date(`${date}T00:00:00Z`);
	const daysSinceMonday = (day.getUTCDay() + 6) % 7;

	day.setUTCDate(day.getUTCDate() - daysSinceMonday);

	return day.toISOString().slice(0, 10);
}
