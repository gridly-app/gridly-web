import type { Shipment } from "@/domain/shipment";

export function plannedPeriod(plan: Shipment["plan"]) {
	const dates = plan.map(({ date }) => date);

	dates.sort();

	const firstDate = dates[0];
	const lastDate = dates.at(-1);

	if (!firstDate) return "Не запланировано";

	if (firstDate === lastDate) return firstDate;

	return `${firstDate} — ${lastDate}`;
}
