import { formatUnit, type Shipment } from "@/domain/shipment";
import { dateKey, encodeCsv } from "@/shared/lib";

export const reconciliationStatuses = {
	complete: "По плану",
	pending: "К отгрузке",
	excess: "Сверх плана",
	unplanned: "Без плана",
} as const;

type Status = keyof typeof reconciliationStatuses;
type Totals = {
	planned: number;
	shipped: number;
	due: number;
	shippedByDate: number;
};

function quantityDifference(expected: number, actual: number) {
	const difference = expected - actual;
	const tolerance = Number.EPSILON * Math.max(expected, actual) * 8;

	return Math.abs(difference) <= tolerance ? 0 : difference;
}

function reconciliationStatus(planned: number, difference: number): Status {
	if (planned === 0) return "unplanned";
	if (difference > 0) return "pending";
	if (difference < 0) return "excess";

	return "complete";
}

export function shipmentReconciliation(
	{
		items,
		plan,
		actual,
		order,
	}: Pick<Shipment, "items" | "plan" | "actual" | "order">,
	asOf: string,
) {
	const itemsById = new Map(items.map((item) => [item.order_line_id, item]));
	const totalsByLine = new Map<
		string,
		Totals & { lineId: string; unit: string }
	>();

	function totalsFor(lineId: string, unit: string) {
		const key = JSON.stringify([lineId, unit]);
		const existing = totalsByLine.get(key);

		if (existing) return existing;

		const totals = {
			lineId,
			unit,
			planned: 0,
			shipped: 0,
			due: 0,
			shippedByDate: 0,
		};

		totalsByLine.set(key, totals);

		return totals;
	}

	for (const row of plan) {
		const totals = totalsFor(row.order_line_id, row.unit);

		totals.planned += row.quantity;

		if (row.date < asOf) totals.due += row.quantity;
	}

	for (const row of actual) {
		const totals = totalsFor(row.order_line_id, row.unit);
		const shippedOn = dateKey(row.shipped_at, order.time_zone);

		totals.shipped += row.quantity;

		if (shippedOn && shippedOn <= asOf) totals.shippedByDate += row.quantity;
	}

	return Array.from(totalsByLine, ([key, totals]) => {
		const { planned, shipped, due, shippedByDate, lineId, unit } = totals;
		const item = itemsById.get(lineId);
		const difference = quantityDifference(planned, shipped);
		const overdue = Math.max(0, quantityDifference(due, shippedByDate));

		return {
			key,
			sku: item?.sku ?? null,
			name: item?.name ?? lineId,
			unit: formatUnit(unit),
			planned,
			shipped,
			remaining: Math.max(0, difference),
			excess: Math.max(0, -difference),
			overdue,
			status: reconciliationStatus(planned, difference),
		};
	});
}

export type ReconciliationRow = ReturnType<
	typeof shipmentReconciliation
>[number];

export function reconciliationCsv(
	orderNumber: string,
	asOf: string,
	rows: ReconciliationRow[],
) {
	const headers = [
		"Заказ",
		"Дата проверки просрочки",
		"Артикул",
		"Позиция",
		"Единица измерения",
		"План",
		"Факт",
		"К отгрузке",
		"Сверх плана",
		"Просрочено",
		"Статус",
	];
	const cells = rows.map((row) => [
		orderNumber,
		asOf,
		row.sku,
		row.name,
		row.unit,
		row.planned,
		row.shipped,
		row.remaining,
		row.excess,
		row.overdue,
		reconciliationStatuses[row.status],
	]);

	return encodeCsv([headers, ...cells], { separator: ";", includeBom: true });
}
