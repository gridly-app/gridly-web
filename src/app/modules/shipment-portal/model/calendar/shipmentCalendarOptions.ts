import type { Shipment } from "@/domain/shipment";

type ShipmentItem = Shipment["items"][number];

export type CalendarItem = Pick<
	ShipmentItem,
	"order_line_id" | "name" | "sku"
> &
	Partial<Pick<ShipmentItem, "grade">>;

export type ShipmentCalendarOptions = {
	shipment: Pick<Shipment, "order" | "plan" | "actual">;
	items: CalendarItem[];
	priority: Shipment["warehouse"]["priority"];
	showPriority: boolean;
};
