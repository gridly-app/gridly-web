import type { Shipment } from "@/domain/shipment";

export const orderStates = {
	active: "В исполнении",
	on_hold: "Приостановлен",
	cancelled: "Отменён",
	delivered: "Доставлен",
} satisfies Record<Shipment["order"]["state"], string>;
