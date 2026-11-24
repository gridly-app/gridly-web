import { UserError } from "../invariants";

const millisecondsPerMinute = 60_000;
const maxOffsetAdjustments = 4;

export function zonedDayBoundary(
	day: string,
	timeZone: string,
	nextDay = false,
) {
	const date = new Date(`${day}T00:00:00Z`);

	if (nextDay) date.setUTCDate(date.getUTCDate() + 1);

	const midnight = date.getTime();
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		timeZoneName: "longOffset",
	});
	let candidate = midnight;

	for (let iteration = 0; iteration < maxOffsetAdjustments; iteration++) {
		const parts = formatter.formatToParts(candidate);
		const offset = parts.find((part) => part.type === "timeZoneName")?.value;
		const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset ?? "");

		if (!match && offset !== "GMT")
			throw new UserError(`Неизвестное смещение часового пояса ${timeZone}.`);

		const direction = match?.[1] === "-" ? -1 : 1;
		const minutes = match
			? (Number(match[2]) * 60 + Number(match[3])) * direction
			: 0;
		const corrected = midnight - minutes * millisecondsPerMinute;

		if (candidate === corrected) return new Date(candidate).toISOString();

		candidate = corrected;
	}

	throw new UserError(
		`Не удалось определить начало дня ${day} в часовом поясе ${timeZone}.`,
	);
}
