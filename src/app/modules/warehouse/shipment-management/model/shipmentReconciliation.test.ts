import { expect, test } from "bun:test";

import type { Actual, Shipment } from "@/domain/shipment";
import { shipmentReconciliation } from "./shipmentReconciliation";

const order: Shipment["order"] = {
	number: "ЗК-1",
	recipient: "Клиент",
	warehouse_name: "Центральный склад",
	time_zone: "Europe/Moscow",
	created_at: "2026-11-10T00:00:00Z",
	state: "active",
	status_reason: null,
	updated_at: "2026-11-13T00:00:00Z",
};

function shipmentFact(
	quantity: number,
	shippedAt: string,
	unit = "pcs",
): Actual {
	return {
		id: `${unit}-${shippedAt}`,
		order_line_id: "coffee",
		quantity,
		unit,
		shipped_at: shippedAt,
		loaded_at: null,
		packaging: null,
		transport_type: "road",
		vehicle_number: null,
		reference_number: null,
		comment: null,
	};
}

test("aggregates saved shipments and calculates overdue quantities in the warehouse time zone", () => {
	const rows = shipmentReconciliation(
		{
			order,
			items: [],
			plan: [
				{
					order_line_id: "coffee",
					date: "2026-11-11",
					quantity: 8,
					unit: "pcs",
				},
				{
					order_line_id: "coffee",
					date: "2026-11-12",
					quantity: 5,
					unit: "pcs",
				},
			],
			actual: [
				shipmentFact(3, "2026-11-11T21:00:00Z"),
				shipmentFact(10, "2026-11-12T21:00:00Z"),
			],
		},
		"2026-11-12",
	);

	expect(rows).toMatchObject([
		{ planned: 13, shipped: 13, remaining: 0, overdue: 5, status: "complete" },
	]);
});

test("reports unplanned units and excess separately for the same position", () => {
	const rows = shipmentReconciliation(
		{
			order,
			items: [],
			plan: [
				{
					order_line_id: "coffee",
					date: "2026-11-11",
					quantity: 2,
					unit: "pcs",
				},
			],
			actual: [
				shipmentFact(3, "2026-11-11T12:00:00Z"),
				shipmentFact(1, "2026-11-11T12:00:00Z", "pack"),
			],
		},
		"2026-11-12",
	);

	expect(rows).toMatchObject([
		{
			unit: "шт.",
			planned: 2,
			shipped: 3,
			excess: 1,
			overdue: 0,
			status: "excess",
		},
		{
			unit: "упак.",
			planned: 0,
			shipped: 1,
			excess: 1,
			overdue: 0,
			status: "unplanned",
		},
	]);
});

test("does not show a discrepancy for equivalent fractional quantities", () => {
	const rows = shipmentReconciliation(
		{
			order,
			items: [],
			plan: [
				{
					order_line_id: "coffee",
					date: "2026-11-11",
					quantity: 0.3,
					unit: "pcs",
				},
			],
			actual: [
				shipmentFact(0.1, "2026-11-11T12:00:00Z"),
				shipmentFact(0.2, "2026-11-11T13:00:00Z"),
			],
		},
		"2026-11-12",
	);

	expect(rows).toMatchObject([
		{ remaining: 0, excess: 0, overdue: 0, status: "complete" },
	]);
});
