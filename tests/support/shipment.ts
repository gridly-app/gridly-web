import type { Shipment } from "@/domain/shipment";

export function shipment(): Shipment {
	return {
		order: {
			number: "OUT-1",
			recipient: "Получатель",
			warehouse_name: "Склад",
			time_zone: "Europe/Moscow",
			created_at: "2026-11-12T00:00:00Z",
			updated_at: "2026-11-12T00:00:00Z",
			state: "active",
			status_reason: null,
		},
		warehouse: { priority: "normal", quantities: [] },
		items: [
			{
				order_line_id: "coffee",
				sku: "C-1",
				name: "Кофе",
				grade: "Арабика",
				quantity: 12,
				unit: "pcs",
				packaging: null,
				variant: null,
			},
		],
		plan: [
			{
				date: "2026-11-13",
				order_line_id: "coffee",
				quantity: 10,
				unit: "pcs",
			},
			{ date: "2026-11-14", order_line_id: "coffee", quantity: 2, unit: "pcs" },
		],
		actual: [
			{
				id: "fact-1",
				order_line_id: "coffee",
				quantity: 3,
				unit: "pcs",
				packaging: null,
				shipped_at: "2026-11-12T22:00:00Z",
				loaded_at: null,
				transport_type: "road",
				vehicle_number: null,
				reference_number: null,
				comment: null,
			},
		],
		milestones: [],
		documents: [],
	};
}
