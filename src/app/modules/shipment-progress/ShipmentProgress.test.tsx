import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Shipment } from "@/domain/shipment";
import { ShipmentProgress } from "./ShipmentProgress";

test("a delivered inbound shipment does not invent previous milestones", () => {
	const shipment: Pick<Shipment, "order" | "milestones"> = {
		order: {
			number: "IN-1",
			recipient: "Склад",
			warehouse_name: "Склад",
			time_zone: "Europe/Moscow",
			created_at: "2026-11-19T00:00:00Z",
			updated_at: "2026-11-19T00:00:00Z",
			state: "delivered",
			status_reason: null,
		},
		milestones: [
			{
				code: "delivered",
				state: "completed",
				occurred_at: null,
				planned_at: null,
				note: null,
			},
		],
	};
	const html = renderToStaticMarkup(
		<ShipmentProgress shipment={shipment} kind="inbound" />,
	);

	expect(html.match(/data-state="completed"/g)).toHaveLength(1);
	expect(html.match(/data-state="pending"/g)).toHaveLength(6);
	expect(html).toContain("Дата неизвестна");
});
