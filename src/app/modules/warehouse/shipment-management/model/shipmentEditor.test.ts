import { expect, test } from "bun:test";
import type { WorkingShipment } from "../api/shipment.dto";
import { shipmentDraft } from "./shipmentEditor";

const shipment: WorkingShipment = {
	allowed_actions: [],
	revision: 4,
	order: {
		number: "O-1",
		recipient: "Получатель",
		warehouse_name: "Склад",
		time_zone: "Europe/Moscow",
		created_at: "2026-11-19T00:00:00Z",
		updated_at: "2026-11-19T00:00:00Z",
		state: "active",
		status_reason: null,
	},
	warehouse: { priority: null, quantities: [] },
	items: [
		{
			order_line_id: "line",
			sku: "SKU",
			name: "Товар",
			quantity: 5,
			unit: "pack",
			grade: null,
			packaging: null,
			variant: null,
		},
	],
	plan: [],
	actual: [],
	milestones: [],
	documents: [],
	share_link: null,
};

test("rejects a plan referring to a line outside the order", () => {
	expect(() =>
		shipmentDraft(
			shipment,
			null,
			"",
			[
				{
					date: "2026-11-19",
					order_line_id: "unknown",
					quantity: 1,
					unit: "pack",
				},
			],
			[],
			[],
		),
	).toThrow("не входит в текущий заказ");
});

test("rejects a different unit for an existing order line", () => {
	expect(() =>
		shipmentDraft(
			shipment,
			null,
			"",
			[{ date: "2026-11-19", order_line_id: "line", quantity: 1, unit: "pcs" }],
			[],
			[],
		),
	).toThrow("Единица измерения");
});

test("checks plan and actual separately against the ordered quantity", () => {
	const plan = [
		{ date: "2026-11-19", order_line_id: "line", quantity: 5, unit: "pack" },
	];
	const actual = [
		{
			id: "fact",
			order_line_id: "line",
			quantity: 5,
			unit: "pack",
			shipped_at: "2026-11-19T10:00:00Z",
			loaded_at: null,
			transport_type: "road" as const,
			packaging: null,
			vehicle_number: null,
			reference_number: null,
			comment: null,
		},
	];

	expect(shipmentDraft(shipment, null, "", plan, actual, []).revision).toBe(4);
	expect(() =>
		shipmentDraft(
			shipment,
			null,
			"",
			[{ ...plan[0]!, quantity: 6 }],
			actual,
			[],
		),
	).toThrow("превышает заказанное");
});
