import type { Shipment } from "@/domain/shipment";
import type { Order } from "@/domain/warehouse";

const statuses = {
	active: { label: "В исполнении", tone: "neutral" },
	on_hold: { label: "Приостановлена", tone: "warning" },
	cancelled: { label: "Отменена", tone: "warning" },
	delivered: { label: "Доставлена", tone: "success" },
} as const;

export function shipmentStatus(
	{ state, status_reason }: Pick<Shipment["order"], "state" | "status_reason">,
	kind: Order["kind"],
) {
	const { label, tone } = statuses[state];
	const isInboundDelivered = kind === "inbound" && state === "delivered";
	const isInterrupted = state === "on_hold" || state === "cancelled";

	return {
		label: isInboundDelivered ? "Принята" : label,
		tone,
		reason: isInterrupted ? status_reason : null,
	};
}
