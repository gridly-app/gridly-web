import type { CompletionForecast } from "../model/orderForecast";
export function forecastLabel(forecast: CompletionForecast, timezone: string) {
	return forecast.at === null
		? forecast.note
		: `≈ ${new Date(forecast.at).toLocaleString("ru-RU", { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
}
