import type { Actual, Shipment } from "@/domain/shipment";
import { transports } from "@/domain/shipment";

export function calendarDay(moment: string, timeZone: string) {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date(moment));
}

function monday(date: string) {
	const day = new Date(`${date}T00:00:00Z`);
	day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
	return day.toISOString().slice(0, 10);
}

type CalendarRow = {
	key: string;
	date: string;
	unit: string;
	plan: number | null;
	actual: number;
	facts: Actual[];
	items: Set<string>;
};

export function shipmentCalendar(
	shipment: Shipment,
	filters: {
		from: string;
		to: string;
		item: string;
		transport: string;
		weekly: boolean;
	},
) {
	const rows = new Map<string, CalendarRow>();
	const getRow = (date: string, unit: string, item: string) => {
		if (
			(filters.from && date < filters.from) ||
			(filters.to && date > filters.to) ||
			(filters.item && filters.item !== item)
		)
			return;
		const bucket = filters.weekly ? monday(date) : date;
		const key = JSON.stringify([bucket, unit]);
		const row = rows.get(key) ?? {
			key,
			date: bucket,
			unit,
			plan: null,
			actual: 0,
			facts: [],
			items: new Set<string>(),
		};
		row.items.add(item);
		rows.set(key, row);
		return row;
	};
	for (const entry of shipment.plan) {
		const row = getRow(entry.date, entry.unit, entry.order_line_id);
		if (row) row.plan = (row.plan ?? 0) + entry.quantity;
	}
	for (const entry of shipment.actual) {
		if (filters.transport && filters.transport !== entry.transport_type)
			continue;
		const row = getRow(
			calendarDay(entry.shipped_at, shipment.order.time_zone),
			entry.unit,
			entry.order_line_id,
		);
		if (!row) continue;
		row.actual += entry.quantity;
		row.facts.push(entry);
	}
	return [...rows.values()];
}

export function shipmentCsv(
	headers: string[],
	rows: (string | number | null)[][],
) {
	return (
		"\uFEFF" +
		[headers, ...rows]
			.map((row) =>
				row
					.map((value) => {
						let cell = String(value ?? "");
						if (typeof value === "string" && /^(\s*[=+@-]|[\t\r\n])/.test(cell))
							cell = `'${cell}`;
						return `"${cell.replaceAll('"', '""')}"`;
					})
					.join(";"),
			)
			.join("\r\n")
	);
}

export function transportSummary(facts: Actual[]) {
	return (
		[...new Set(facts.map((fact) => transports[fact.transport_type]))].join(
			", ",
		) || "—"
	);
}
